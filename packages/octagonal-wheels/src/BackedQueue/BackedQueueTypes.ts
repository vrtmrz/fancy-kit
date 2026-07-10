import { LSError } from "../common/error.ts";

/**
 * Key type for items in the queue.
 * For documentation purposes only. Branded types are not used.
 */
export type QueueKey = string;

/**
 * Key type for items being processed from the queue.
 * For documentation purposes only. Branded types are not used.
 */
export type QueueKeyOnProcess = QueueKey;

/**
 * Options for querying the queue.
 */
export type QueryOptions = {
    /**
     * Timeout in milliseconds for the operation.
     */
    timeoutMs?: number;
    /**
     * AbortSignal used to cancel the operation.
     */
    signal?: AbortSignal;
};

/**
 * Base class for queue-related errors.
 */
export class QueueError extends LSError {}

/**
 * Error class for queue operation errors.
 */
export class QueueOperationError extends QueueError {}

/**
 * Error class for queue timeout errors.
 */
export class QueueTimeoutError extends QueueError {}

/**
 * Error class for queue cancellation errors.
 */
export class QueueAbortError extends QueueError {}

/**
 * Options for dequeuing items from the queue.
 */
export type DequeueOptions = QueryOptions;

/**
 * Position for requeueing items.
 * Note: requeueing at the front can lead to starvation of other items.
 * Additionally, nextN is omitted in design.
 */
export const RequeuePosition = {
    /**
     * Keep the original position in the logical ordering.
     * Items are kept ahead of later inserts. Use with great care as starvation risk exists.
     * Permanent queues are usually ordered FIFO, often by prefixed string comparison.
     * Preserving the original position is commonly achieved by preventing deletion rather than re-inserting at the front.
     * This may be dangerous. Use only when implications are fully understood.
     */
    DANGER_KEEP_ORIGINAL: 0,
    /**
     * Requeue at the back of the queue.
     * Items are processed after all items currently present.
     * Implemented by deleting the existing item and inserting it anew.
     */
    LAST: 1,
} as const;

/**
 * An item dequeued from the queue with its key.
 */
export type DequeuedItem<T> = {
    /**
     * Key of the item being processed.
     */
    key: QueueKeyOnProcess;
    /**
     * The item being processed.
     */
    item: T;
};

export type RequestPositions = (typeof RequeuePosition)[keyof typeof RequeuePosition];

export interface QueueProcessContext {
    commit(keys: QueueKeyOnProcess): Promise<void>;
    requeue(keys: QueueKeyOnProcess, position?: RequestPositions): Promise<void>;
    revoke(keys: QueueKeyOnProcess | QueueKey): Promise<void>;
}

/**
 * Callback type for processing dequeued items.
 * If context.commit, context.requeue, or context.revoke is not called, the queue commits the item automatically after the callback finishes.
 * Throwing without using context methods causes automatic revocation of the item.
 * If a Promise is returned, the queue waits for it to resolve before proceeding.
 * Warning: if the callback throws, default behaviour depends on implementation.
 */
export type DequeueCallback<T> = (
    items: DequeuedItem<T>,
    context: QueueProcessContext
) => Promise<any | void> | any | void;

/**
 * Callback type for locating items in the queue.
 */
export type FindCallback<T> = (item: DequeuedItem<T>) => boolean | Promise<boolean>;

/**
 * Options for locating items in the queue.
 */
export type FindOptions = {
    /**
     * Start searching from this key. If not provided, searching starts at the beginning.
     */
    startKey?: QueueKey;
    /**
     * Maximum number of items to inspect.
     * If not provided, all items are inspected.
     */
    limit?: number;
};

/**
 * Prefix for persistent backed queue keys.
 * Used in PersistentIDBackedQueue.
 * Change this value only with an appropriate migration strategy.
 */
export const PREFIX_BACKED_QUEUE_PERSISTENT = "bq-p";

/**
 * Prefix for half-persistent backed queue keys.
 * Used in HalfPersistentIDBackedQueue.
 * Values with this prefix are volatile and may be changed.
 * Storage consumption may increase if careless changes are made without migration.
 */
export const PREFIX_BACKED_QUEUE_HALF_PERSISTENT = "bq-h";
