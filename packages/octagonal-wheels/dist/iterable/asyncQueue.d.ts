import type { DisposableResource } from "../resource.ts";
/** A disposable FIFO queue with one asynchronous iterator. */
export interface AsyncQueue<T> extends AsyncIterable<T>, DisposableResource {
    /** Number of unread values still held in the queue. */
    readonly size: number;
    /**
     * Appends one value in FIFO order.
     *
     * @throws Error after finish or dispose.
     */
    enqueue(item: T): void;
    /**
     * Stops accepting values and lets the iterator drain buffered values.
     *
     * Repeated calls are harmless. Disposal after finish discards any remaining
     * buffered values.
     */
    finish(): void;
    /**
     * Stops accepting values, drops all buffered references, and wakes a waiting
     * empty read as done.
     *
     * Repeated calls are harmless. A value already claimed for a pending
     * next() result cannot be revoked by later disposal.
     */
    dispose(): void;
    /**
     * Acquires the queue's single iterator.
     *
     * A second acquisition throws. The iterator's return() disposes the queue,
     * and only one empty-queue next() may be pending at a time. A next() result
     * already claimed by a waiting reader cannot be revoked by later disposal.
     */
    [Symbol.asyncIterator](): AsyncIterator<T>;
}
/**
 * Creates an in-memory FIFO queue for one consumer.
 *
 * Values are retained by identity, including undefined and promise-valued
 * values. The iterator returns each value as-is; consumers decide whether to
 * await a promise stored as a value. Enqueue has no fixed capacity. The queue
 * has no retries, cancellation signal, persistence, or callback concurrency;
 * owners can register dispose() with their scope and connect cancellation to
 * disposal.
 *
 * @returns A queue with a single async iterator and explicit disposal.
 */
export declare function createAsyncQueue<T>(): AsyncQueue<T>;
