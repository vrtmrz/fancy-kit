/**
 * Generic backed queue interface. (Base classes)
 */
import type { SimpleStoreCRUDSupportTransaction } from "../databases/SimpleStoreBase";
import { type QueueKeyOnProcess, type RequestPositions, type QueueKey, type QueryOptions, type DequeueOptions, type DequeuedItem, type DequeueCallback } from "./BackedQueueTypes";
import { QueueBackendTransaction, QueueBackendWithTransaction } from "./QueueBackendTypes";
/**
 * Abstract base class for a backed queue.
 * We employ simple in-memory tracking for primary implementation purposes.
 * Operations prior to commit are non-atomic, must be idempotent, and must avoid side effects until commit completes.
 * @template T Type of items in the queue.
 */
export declare abstract class BackedQueue<T> {
    /**
     * Backend store for the queue.
     */
    protected abstract backend: QueueBackendWithTransaction<T>;
    /**
     * Promise that resolves when the queue is ready.
     */
    protected readyPromise: Promise<void>;
    get isReady(): Promise<void>;
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
    commit(key: QueueKeyOnProcess): Promise<void>;
    /**
     * Requeue an item.
     * @param key Key of the item to requeue.
     * @param position Target position for the requeued item.
     */
    requeue(key: QueueKeyOnProcess, position?: RequestPositions): Promise<void>;
    /**
     * Revoke an item from queue or processing.
     * If the item is in the queue, we remove it.
     * In-flight items are marked revoked and are not committed. Call this when processing determines removal.
     * @param key Key of the item to revoke.
     */
    revoke(key: QueueKeyOnProcess | QueueKey): Promise<void>;
    /**
     * Name of the queue.
     */
    protected readonly _name: string;
    /**
     * Construct a new BackedQueue instance.
     * @param name Queue name.
     */
    constructor(name: string);
    /**
     * Handle an item added to the dead letter queue.
     * @param key Key of the item added to the dead letter queue.
     * @param item Item added to the dead letter queue.
     * @param reason Reason for dead lettering.
     */
    protected onDeadLetter(key: QueueKeyOnProcess, item: T, reason: Error): Promise<void>;
    private _enqueueWaiters;
    private _dequeueWaiters;
    /**
     * Prepare a waiter with query options.
     * @param options Query options.
     * @returns Promise with resolvers and a release function.
     */
    private handleQueryOptions;
    /**
     * Wait for the next enqueue.
     * @param options Query options.
     */
    protected waitNextEnqueued(options?: QueryOptions): Promise<void>;
    /**
     * Wait for the next dequeue.
     * @param options Query options.
     */
    protected waitNextDequeue(options?: QueryOptions): Promise<void>;
    /**
     * Notify that an item has been enqueued.
     * We allow spurious wake-ups for robustness.
     */
    protected onEnqueued(): void;
    /**
     * Notify that an item has been dequeued.
     */
    protected onDequeued(): void;
    /**
     * Move an item from queue to processing.
     * @param tx Backend store transaction.
     * @param key Key of the item to move.
     */
    protected _queueToProcessing(tx: QueueBackendTransaction<T>, key: QueueKey): Promise<void>;
    /**
     * Restore an item from processing back to the queue.
     * @param key Key of the item to restore.
     * @returns Promise that resolves when complete.
     */
    protected restoreToQueue(key: QueueKeyOnProcess): Promise<void>;
    /**
     * Check if the queue is empty.
     * @returns True if empty, false otherwise.
     */
    isQueueEmpty(): Promise<boolean>;
    /**
     * Check if any items are in flight.
     * @returns True if at least one item is in flight, false otherwise.
     */
    isAnyInFlight(): Promise<boolean>;
    /**
     * Wait until at least one item is available.
     * @param options Query options (same shape as DequeueOptions, without dequeue).
     */
    protected waitForNext(options?: DequeueOptions): Promise<QueueKey>;
    /**
     * Dequeue one item.
     * While processing, items are in-flight and remain locked until committed, requeued, or revoked.
     * In-flight state is implementation dependent and volatile.
     * @param options Dequeue options.
     */
    private __dequeue;
    /**
     * Dequeue an item.
     * @param options Dequeue options.
     * @returns Dequeued item.
     */
    dequeue(options?: DequeueOptions): Promise<DequeuedItem<T>>;
    /**
     * Enqueue an item.
     * @param item Item to enqueue.
     * @returns Key of the enqueued item.
     */
    enqueue(item: T): Promise<QueueKey>;
    /**
     * Dequeue and process an item via a callback.
     * @param options Dequeue options.
     * @param callback Processing callback.
     */
    process(options: DequeueOptions, callback: DequeueCallback<T>): Promise<void>;
    /**
     * Wait until the queue becomes empty.
     * @param options Query options.
     */
    waitForEmptyQueue(options?: QueryOptions): Promise<void>;
}
/**
 * Persistent backed queue base that tracks in-flight processing keys.
 * Suitable for multi-worker scenarios.
 * @template T Type of items in the queue.
 */
export declare abstract class PersistentIDBBackedQueueBase<T> extends BackedQueue<T> {
    backend: QueueBackendWithTransaction<T>;
    /**
     * Base prefix for the queue.
     */
    abstract get basePrefix(): string;
    /**
     * Initialise the queue with storage.
     * @param storage Storage backend.
     */
    init(storage: SimpleStoreCRUDSupportTransaction<T>): Promise<void>;
    /**
     * Construct a new PersistentIDBackedQueueBase instance.
     * @param name Queue name.
     * @param storage Storage backend.
     */
    constructor(name: string, storage: SimpleStoreCRUDSupportTransaction<T>);
    addDeadLetter(key: QueueKeyOnProcess, item: T): Promise<void>;
    dequeue(options?: DequeueOptions): Promise<DequeuedItem<T>>;
    enqueue(item: T): Promise<QueueKey>;
    process(options: DequeueOptions, callback: DequeueCallback<T>): Promise<void>;
    waitForEmptyQueue(options?: QueryOptions): Promise<void>;
}
