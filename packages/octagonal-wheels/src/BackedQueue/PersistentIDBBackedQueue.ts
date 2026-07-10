import { PersistentIDBBackedQueueBase } from "./BackedQueue.ts";
import { PREFIX_BACKED_QUEUE_PERSISTENT } from "./BackedQueueTypes.ts";

/**
 * A persistent backed queue that tracks 'in-flight' processing keys.
 * Suitable for multi-worker scenarios.
 * @template T The type of items in the queue.
 */
export class PersistentIDBBackedQueue<T> extends PersistentIDBBackedQueueBase<T> {
    get basePrefix() {
        return PREFIX_BACKED_QUEUE_PERSISTENT;
    }
}
