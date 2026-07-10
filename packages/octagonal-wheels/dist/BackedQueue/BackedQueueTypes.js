import { LSError } from '../common/error.js';

/**
 * Base class for queue-related errors.
 */
class QueueError extends LSError {
}
/**
 * Error class for queue operation errors.
 */
class QueueOperationError extends QueueError {
}
/**
 * Error class for queue timeout errors.
 */
class QueueTimeoutError extends QueueError {
}
/**
 * Error class for queue cancellation errors.
 */
class QueueAbortError extends QueueError {
}
/**
 * Position for requeueing items.
 * Note: requeueing at the front can lead to starvation of other items.
 * Additionally, nextN is omitted in design.
 */
const RequeuePosition = {
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
};
/**
 * Prefix for persistent backed queue keys.
 * Used in PersistentIDBackedQueue.
 * Change this value only with an appropriate migration strategy.
 */
const PREFIX_BACKED_QUEUE_PERSISTENT = "bq-p";
/**
 * Prefix for half-persistent backed queue keys.
 * Used in HalfPersistentIDBackedQueue.
 * Values with this prefix are volatile and may be changed.
 * Storage consumption may increase if careless changes are made without migration.
 */
const PREFIX_BACKED_QUEUE_HALF_PERSISTENT = "bq-h";

export { PREFIX_BACKED_QUEUE_HALF_PERSISTENT, PREFIX_BACKED_QUEUE_PERSISTENT, QueueAbortError, QueueError, QueueOperationError, QueueTimeoutError, RequeuePosition };
//# sourceMappingURL=BackedQueueTypes.js.map
