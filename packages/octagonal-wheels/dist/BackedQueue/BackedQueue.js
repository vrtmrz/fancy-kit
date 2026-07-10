import { LSError } from '../common/error.js';
import { Logger, LOG_LEVEL_VERBOSE, LOG_LEVEL_INFO } from '../common/logger.js';
import { promiseWithResolvers } from '../promises.js';
import { RequeuePosition, QueueAbortError, QueueOperationError, QueueTimeoutError } from './BackedQueueTypes.js';
import { QueueBackend } from './QueueBackend.js';

/**
 * Generic backed queue interface. (Base classes)
 */
/**
 * Abstract base class for a backed queue.
 * We employ simple in-memory tracking for primary implementation purposes.
 * Operations prior to commit are non-atomic, must be idempotent, and must avoid side effects until commit completes.
 * @template T Type of items in the queue.
 */
class BackedQueue {
    get isReady() {
        return this.readyPromise;
    }
    /**
     * Commit a processed item.
     * @param key Key of the item to commit.
     */
    commit(key) {
        return this.backend.atomic(async (tx) => {
            await tx.deleteProcessingItem(key);
            return Promise.resolve();
        });
    }
    /**
     * Requeue an item.
     * @param key Key of the item to requeue.
     * @param position Target position for the requeued item.
     */
    requeue(key, position = RequeuePosition.LAST) {
        return this.backend.atomic(async (tx) => {
            const item = await tx.getProcessingItem(key);
            if (item) {
                if (position !== RequeuePosition.DANGER_KEEP_ORIGINAL) {
                    const newKey = tx.issueNewQueueKey();
                    await tx.setQueueItem(newKey, item);
                    await tx.deleteProcessingItem(key);
                }
                else {
                    await tx.setQueueItem(key, item);
                    await tx.deleteProcessingItem(key);
                }
            }
            await tx.deleteProcessingItem(key);
        });
    }
    /**
     * Revoke an item from queue or processing.
     * If the item is in the queue, we remove it.
     * In-flight items are marked revoked and are not committed. Call this when processing determines removal.
     * @param key Key of the item to revoke.
     */
    revoke(key) {
        return this.backend.atomic(async (tx) => {
            await tx.deleteQueueItem(key);
            await tx.deleteProcessingItem(key);
        });
    }
    /**
     * Construct a new BackedQueue instance.
     * @param name Queue name.
     */
    constructor(name) {
        /**
         * Promise that resolves when the queue is ready.
         */
        Object.defineProperty(this, "readyPromise", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: Promise.resolve()
        });
        /**
         * Name of the queue.
         */
        Object.defineProperty(this, "_name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // In-memory waiters for enqueue and dequeue events
        Object.defineProperty(this, "_enqueueWaiters", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Set()
        });
        Object.defineProperty(this, "_dequeueWaiters", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Set()
        });
        this._name = name;
    }
    /**
     * Handle an item added to the dead letter queue.
     * @param key Key of the item added to the dead letter queue.
     * @param item Item added to the dead letter queue.
     * @param reason Reason for dead lettering.
     */
    async onDeadLetter(key, item, reason) {
        Logger(`Item with key ${key} added to dead letter queue.`, LOG_LEVEL_VERBOSE);
        Logger(reason, LOG_LEVEL_VERBOSE);
        await this.addDeadLetter(key, item);
        await this.revoke(key);
    }
    /**
     * Prepare a waiter with query options.
     * @param options Query options.
     * @returns Promise with resolvers and a release function.
     */
    handleQueryOptions(options) {
        let timeoutId;
        const resolver = promiseWithResolvers();
        const release = () => {
            if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
                timeoutId = undefined;
            }
            if (options?.signal) {
                options.signal.removeEventListener("abort", onAbortHandler);
            }
        };
        const onAbortHandler = () => {
            release();
            resolver.reject(new QueueAbortError("Operation aborted"));
        };
        const onTimeoutHandler = () => {
            release();
            resolver.reject(new QueueTimeoutError("Operation timed out"));
        };
        if (options) {
            if (options.timeoutMs !== undefined) {
                timeoutId = setTimeout(() => onTimeoutHandler(), options.timeoutMs);
            }
            if (options.signal) {
                if (options.signal.aborted) {
                    release();
                    resolver.reject(new QueueAbortError("Operation already has aborted"));
                }
                else {
                    options.signal.addEventListener("abort", onAbortHandler);
                }
            }
        }
        return {
            pwr: resolver,
            release: () => {
                release();
            },
        };
    }
    /**
     * Wait for the next enqueue.
     * @param options Query options.
     */
    async waitNextEnqueued(options) {
        const pwr = this.handleQueryOptions(options);
        const r = pwr.pwr;
        this._enqueueWaiters.add(r);
        try {
            return await r.promise;
        }
        finally {
            pwr.release();
            this._enqueueWaiters.delete(r);
        }
    }
    /**
     * Wait for the next dequeue.
     * @param options Query options.
     */
    async waitNextDequeue(options) {
        const pwr = this.handleQueryOptions(options);
        const r = pwr.pwr;
        this._dequeueWaiters.add(r);
        try {
            return await r.promise;
        }
        finally {
            pwr.release();
            this._dequeueWaiters.delete(r);
        }
    }
    /**
     * Notify that an item has been enqueued.
     * We allow spurious wake-ups for robustness.
     */
    onEnqueued() {
        for (const waiter of this._enqueueWaiters) {
            waiter.resolve();
        }
    }
    /**
     * Notify that an item has been dequeued.
     */
    onDequeued() {
        for (const waiter of this._dequeueWaiters) {
            waiter.resolve();
        }
    }
    /**
     * Move an item from queue to processing.
     * @param tx Backend store transaction.
     * @param key Key of the item to move.
     */
    async _queueToProcessing(tx, key) {
        const item = await tx.getQueuedItem(key);
        if (item === undefined) {
            throw new QueueOperationError("Inconsistent state [_queueToProcessing]: item not found for key " + key);
        }
        if ((await tx.getProcessingItem(key)) !== undefined) {
            throw new QueueOperationError("Inconsistent state [_queueToProcessing]: item already exists for key " + key);
        }
        await tx.setProcessingItem(key, item);
        await tx.deleteQueueItem(key);
    }
    /**
     * Restore an item from processing back to the queue.
     * @param key Key of the item to restore.
     * @returns Promise that resolves when complete.
     */
    restoreToQueue(key) {
        return this.backend.atomic(async (tx) => {
            const item = await tx.getProcessingItem(key);
            if (item === undefined) {
                throw new QueueOperationError("Inconsistent state [restoreToQueue]: item not found for key " + key);
            }
            await tx.setQueueItem(key, item);
            await tx.deleteProcessingItem(key);
        });
    }
    /**
     * Check if the queue is empty.
     * @returns True if empty, false otherwise.
     */
    async isQueueEmpty() {
        const nextKey = await this.backend.getNextQueueKey();
        return nextKey === undefined;
    }
    /**
     * Check if any items are in flight.
     * @returns True if at least one item is in flight, false otherwise.
     */
    async isAnyInFlight() {
        const prefixProcessing = this.backend.processingPrefix;
        const keys = await this.backend.keys(prefixProcessing, prefixProcessing + "\uffff", 1);
        return keys.length > 0;
    }
    /**
     * Wait until at least one item is available.
     * @param options Query options (same shape as DequeueOptions, without dequeue).
     */
    async waitForNext(options) {
        let nextKey;
        do {
            await this.backend.atomic(async (tx) => {
                nextKey = await tx.getNextQueueKey();
                if (!nextKey) {
                    return;
                }
                await this._queueToProcessing(tx, nextKey);
            });
            if (!nextKey) {
                await this.waitNextEnqueued(options);
            }
        } while (!nextKey);
        return nextKey;
    }
    /**
     * Dequeue one item.
     * While processing, items are in-flight and remain locked until committed, requeued, or revoked.
     * In-flight state is implementation dependent and volatile.
     * @param options Dequeue options.
     */
    async __dequeue(options) {
        const nextKey = await this.waitForNext(options);
        this.onDequeued();
        const item = await this.backend.getProcessingItem(nextKey);
        if (item === undefined) {
            throw new QueueOperationError("Inconsistent state [__dequeue]: item not found for key " + nextKey);
        }
        return { key: nextKey, item };
    }
    /**
     * Dequeue an item.
     * @param options Dequeue options.
     * @returns Dequeued item.
     */
    dequeue(options) {
        return this.__dequeue(options ?? {});
    }
    /**
     * Enqueue an item.
     * @param item Item to enqueue.
     * @returns Key of the enqueued item.
     */
    async enqueue(item) {
        const key = this.backend.issueNewQueueKey();
        await this.backend.setQueueItem(key, item);
        this.onEnqueued();
        return key;
    }
    /**
     * Dequeue and process an item via a callback.
     * @param options Dequeue options.
     * @param callback Processing callback.
     */
    async process(options, callback) {
        const dequeued = await this.dequeue(options);
        let shouldHandle = true;
        try {
            await callback(dequeued, {
                commit: (keys) => {
                    shouldHandle = false;
                    return this.commit(keys);
                },
                requeue: (keys, position) => {
                    shouldHandle = false;
                    return this.requeue(keys, position);
                },
                revoke: (keys) => {
                    shouldHandle = false;
                    return this.revoke(keys);
                },
            });
        }
        catch (err) {
            if (shouldHandle) {
                await this.onDeadLetter(dequeued.key, dequeued.item, LSError.fromError(err));
                shouldHandle = false;
            }
            throw err;
        }
        finally {
            if (shouldHandle) {
                await this.commit(dequeued.key);
            }
        }
    }
    /**
     * Wait until the queue becomes empty.
     * @param options Query options.
     */
    async waitForEmptyQueue(options) {
        let nextKey;
        do {
            nextKey = await this.backend.getNextQueueKey();
            if (!nextKey) {
                break;
            }
            await this.waitNextDequeue(options);
        } while (nextKey);
    }
}
/**
 * Persistent backed queue base that tracks in-flight processing keys.
 * Suitable for multi-worker scenarios.
 * @template T Type of items in the queue.
 */
class PersistentIDBBackedQueueBase extends BackedQueue {
    /**
     * Initialise the queue with storage.
     * @param storage Storage backend.
     */
    async init(storage) {
        this.backend = new QueueBackend(storage, this._name, this.basePrefix);
        try {
            const prefixProcessing = this.backend.processingPrefix;
            const keys = await this.backend.keys(prefixProcessing, prefixProcessing + "\uffff");
            for (const key of keys) {
                const originalKey = key.substring(prefixProcessing.length);
                await this.restoreToQueue(originalKey);
            }
        }
        catch (err) {
            Logger(`Error during recovery of in-flight items`, LOG_LEVEL_INFO);
            Logger(err, LOG_LEVEL_VERBOSE);
        }
    }
    /**
     * Construct a new PersistentIDBackedQueueBase instance.
     * @param name Queue name.
     * @param storage Storage backend.
     */
    constructor(name, storage) {
        super(name);
        Object.defineProperty(this, "backend", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.readyPromise = this.init(storage);
    }
    addDeadLetter(key, item) {
        Logger(`Dead letter added for key ${key}`, LOG_LEVEL_INFO);
        return Promise.resolve();
    }
    async dequeue(options) {
        await this.isReady;
        return super.dequeue(options);
    }
    async enqueue(item) {
        await this.isReady;
        return super.enqueue(item);
    }
    async process(options, callback) {
        await this.isReady;
        return super.process(options, callback);
    }
    async waitForEmptyQueue(options) {
        await this.isReady;
        return super.waitForEmptyQueue(options);
    }
}

export { BackedQueue, PersistentIDBBackedQueueBase };
//# sourceMappingURL=BackedQueue.js.map
