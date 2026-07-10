import { PersistentIDBBackedQueueBase } from "./BackedQueue.ts";
/**
 * A persistent backed queue that tracks 'in-flight' processing keys.
 * Suitable for multi-worker scenarios.
 * @template T The type of items in the queue.
 */
export declare class PersistentIDBBackedQueue<T> extends PersistentIDBBackedQueueBase<T> {
    get basePrefix(): string;
}
