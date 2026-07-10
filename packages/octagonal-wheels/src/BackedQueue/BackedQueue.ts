/**
 * Generic backed queue interface. (Base classes)
 */

import { LSError } from "../common/error";
import { LOG_LEVEL_INFO, LOG_LEVEL_VERBOSE, Logger } from "../common/logger";
import type { SimpleStoreCRUDSupportTransaction } from "../databases/SimpleStoreBase";
import { promiseWithResolvers, type PromiseWithResolvers } from "../promises";
import {
    QueueAbortError,
    RequeuePosition,
    type QueueKeyOnProcess,
    type RequestPositions,
    type QueueKey,
    type QueryOptions,
    QueueTimeoutError,
    type DequeueOptions,
    type DequeuedItem,
    QueueOperationError,
    type DequeueCallback,
} from "./BackedQueueTypes";
import { QueueBackend } from "./QueueBackend";
import { QueueBackendTransaction, QueueBackendWithTransaction } from "./QueueBackendTypes";
/**
 * Abstract base class for a backed queue.
 * We employ simple in-memory tracking for primary implementation purposes.
 * Operations prior to commit are non-atomic, must be idempotent, and must avoid side effects until commit completes.
 * @template T Type of items in the queue.
 */
export abstract class BackedQueue<T> {
    /**
     * Backend store for the queue.
     */
    protected abstract backend: QueueBackendWithTransaction<T>;
    /**
     * Promise that resolves when the queue is ready.
     */
    protected readyPromise: Promise<void> = Promise.resolve();
    get isReady() {
        return this.readyPromise;
    }
    /**
     * Add an item to the dead letter queue.
     * @param key Key of the item being added to the dead letter queue.
     * @param item Item being added to the dead letter queue.
     */
    protected abstract addDeadLetter(key: QueueKeyOnProcess, item: T): Promise<void>;

    /**
     * Commit a processed item.
     * @param key Key of the item to commit.
     */
    public commit(key: QueueKeyOnProcess): Promise<void> {
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
    public requeue(key: QueueKeyOnProcess, position: RequestPositions = RequeuePosition.LAST): Promise<void> {
        return this.backend.atomic(async (tx) => {
            const item = await tx.getProcessingItem(key);
            if (item) {
                if (position !== RequeuePosition.DANGER_KEEP_ORIGINAL) {
                    const newKey = tx.issueNewQueueKey();
                    await tx.setQueueItem(newKey, item);
                    await tx.deleteProcessingItem(key);
                } else {
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
    public revoke(key: QueueKeyOnProcess | QueueKey): Promise<void> {
        return this.backend.atomic(async (tx) => {
            await tx.deleteQueueItem(key);
            await tx.deleteProcessingItem(key);
        });
    }

    /**
     * Name of the queue.
     */
    protected readonly _name: string;
    /**
     * Construct a new BackedQueue instance.
     * @param name Queue name.
     */
    constructor(name: string) {
        this._name = name;
    }

    /**
     * Handle an item added to the dead letter queue.
     * @param key Key of the item added to the dead letter queue.
     * @param item Item added to the dead letter queue.
     * @param reason Reason for dead lettering.
     */
    protected async onDeadLetter(key: QueueKeyOnProcess, item: T, reason: Error): Promise<void> {
        Logger(`Item with key ${key} added to dead letter queue.`, LOG_LEVEL_VERBOSE);
        Logger(reason, LOG_LEVEL_VERBOSE);
        await this.addDeadLetter(key, item);
        await this.revoke(key);
    }

    // In-memory waiters for enqueue and dequeue events
    private _enqueueWaiters = new Set<PromiseWithResolvers<void>>();
    private _dequeueWaiters = new Set<PromiseWithResolvers<void>>();

    /**
     * Prepare a waiter with query options.
     * @param options Query options.
     * @returns Promise with resolvers and a release function.
     */
    private handleQueryOptions(options: QueryOptions | undefined) {
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const resolver = promiseWithResolvers<void>();

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
                } else {
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
    protected async waitNextEnqueued(options?: QueryOptions): Promise<void> {
        const pwr = this.handleQueryOptions(options);
        const r = pwr.pwr;
        this._enqueueWaiters.add(r);
        try {
            return await r.promise;
        } finally {
            pwr.release();
            this._enqueueWaiters.delete(r);
        }
    }

    /**
     * Wait for the next dequeue.
     * @param options Query options.
     */
    protected async waitNextDequeue(options?: QueryOptions): Promise<void> {
        const pwr = this.handleQueryOptions(options);
        const r = pwr.pwr;
        this._dequeueWaiters.add(r);
        try {
            return await r.promise;
        } finally {
            pwr.release();
            this._dequeueWaiters.delete(r);
        }
    }

    /**
     * Notify that an item has been enqueued.
     * We allow spurious wake-ups for robustness.
     */
    protected onEnqueued(): void {
        for (const waiter of this._enqueueWaiters) {
            waiter.resolve();
        }
    }

    /**
     * Notify that an item has been dequeued.
     */
    protected onDequeued(): void {
        for (const waiter of this._dequeueWaiters) {
            waiter.resolve();
        }
    }
    /**
     * Move an item from queue to processing.
     * @param tx Backend store transaction.
     * @param key Key of the item to move.
     */
    protected async _queueToProcessing(tx: QueueBackendTransaction<T>, key: QueueKey): Promise<void> {
        const item = await tx.getQueuedItem(key);
        if (item === undefined) {
            throw new QueueOperationError("Inconsistent state [_queueToProcessing]: item not found for key " + key);
        }
        if ((await tx.getProcessingItem(key)) !== undefined) {
            throw new QueueOperationError(
                "Inconsistent state [_queueToProcessing]: item already exists for key " + key
            );
        }
        await tx.setProcessingItem(key, item);
        await tx.deleteQueueItem(key);
    }

    /**
     * Restore an item from processing back to the queue.
     * @param key Key of the item to restore.
     * @returns Promise that resolves when complete.
     */
    protected restoreToQueue(key: QueueKeyOnProcess) {
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
    public async isQueueEmpty(): Promise<boolean> {
        const nextKey = await this.backend.getNextQueueKey();
        return nextKey === undefined;
    }
    /**
     * Check if any items are in flight.
     * @returns True if at least one item is in flight, false otherwise.
     */
    public async isAnyInFlight(): Promise<boolean> {
        const prefixProcessing = this.backend.processingPrefix;
        const keys = await this.backend.keys(prefixProcessing, prefixProcessing + "\uffff", 1);
        return keys.length > 0;
    }

    /**
     * Wait until at least one item is available.
     * @param options Query options (same shape as DequeueOptions, without dequeue).
     */
    protected async waitForNext(options?: DequeueOptions): Promise<QueueKey> {
        let nextKey: QueueKey | undefined;
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
    private async __dequeue(options: DequeueOptions): Promise<DequeuedItem<T>> {
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
    public dequeue(options?: DequeueOptions): Promise<DequeuedItem<T>> {
        return this.__dequeue(options ?? {});
    }

    /**
     * Enqueue an item.
     * @param item Item to enqueue.
     * @returns Key of the enqueued item.
     */
    public async enqueue(item: T): Promise<QueueKey> {
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
    public async process(options: DequeueOptions, callback: DequeueCallback<T>): Promise<void> {
        const dequeued = await this.dequeue(options);
        let shouldHandle: boolean = true;
        try {
            await callback(dequeued, {
                commit: (keys: QueueKeyOnProcess) => {
                    shouldHandle = false;
                    return this.commit(keys);
                },
                requeue: (keys: QueueKeyOnProcess, position?: RequestPositions) => {
                    shouldHandle = false;
                    return this.requeue(keys, position);
                },
                revoke: (keys: QueueKeyOnProcess | QueueKey) => {
                    shouldHandle = false;
                    return this.revoke(keys);
                },
            });
        } catch (err) {
            if (shouldHandle) {
                await this.onDeadLetter(dequeued.key, dequeued.item, LSError.fromError(err));
                shouldHandle = false;
            }
            throw err;
        } finally {
            if (shouldHandle) {
                await this.commit(dequeued.key);
            }
        }
    }

    /**
     * Wait until the queue becomes empty.
     * @param options Query options.
     */
    public async waitForEmptyQueue(options?: QueryOptions): Promise<void> {
        let nextKey: QueueKey | undefined;
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
export abstract class PersistentIDBBackedQueueBase<T> extends BackedQueue<T> {
    backend!: QueueBackendWithTransaction<T>;
    /**
     * Base prefix for the queue.
     */
    abstract get basePrefix(): string;
    /**
     * Initialise the queue with storage.
     * @param storage Storage backend.
     */
    async init(storage: SimpleStoreCRUDSupportTransaction<T>): Promise<void> {
        this.backend = new QueueBackend<T>(storage, this._name, this.basePrefix);
        try {
            const prefixProcessing = this.backend.processingPrefix;
            const keys = await this.backend.keys(prefixProcessing, prefixProcessing + "\uffff");
            for (const key of keys) {
                const originalKey = key.substring(prefixProcessing.length);
                await this.restoreToQueue(originalKey);
            }
        } catch (err) {
            Logger(`Error during recovery of in-flight items`, LOG_LEVEL_INFO);
            Logger(err, LOG_LEVEL_VERBOSE);
        }
    }

    /**
     * Construct a new PersistentIDBackedQueueBase instance.
     * @param name Queue name.
     * @param storage Storage backend.
     */
    constructor(name: string, storage: SimpleStoreCRUDSupportTransaction<T>) {
        super(name);
        this.readyPromise = this.init(storage);
    }

    addDeadLetter(key: QueueKeyOnProcess, item: T): Promise<void> {
        Logger(`Dead letter added for key ${key}`, LOG_LEVEL_INFO);
        return Promise.resolve();
    }

    override async dequeue(options?: DequeueOptions): Promise<DequeuedItem<T>> {
        await this.isReady;
        return super.dequeue(options);
    }
    override async enqueue(item: T): Promise<QueueKey> {
        await this.isReady;
        return super.enqueue(item);
    }

    override async process(options: DequeueOptions, callback: DequeueCallback<T>): Promise<void> {
        await this.isReady;
        return super.process(options, callback);
    }
    public async waitForEmptyQueue(options?: QueryOptions): Promise<void> {
        await this.isReady;
        return super.waitForEmptyQueue(options);
    }
}
