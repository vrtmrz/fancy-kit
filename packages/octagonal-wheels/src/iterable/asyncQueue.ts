import type { DisposableResource } from "../resource.ts";

function createDoneResult(): IteratorReturnResult<undefined> {
    return { done: true, value: undefined };
}

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
export function createAsyncQueue<T>(): AsyncQueue<T> {
    let buffer: (T | undefined)[] = [];
    let head = 0;
    let size = 0;
    let finished = false;
    let disposed = false;
    let iteratorAcquired = false;
    let readInFlight = false;
    let waitingReader: { resolve(result: IteratorResult<T>): void } | undefined;

    function growBuffer(): void {
        const nextBuffer = new Array<T | undefined>(Math.max(buffer.length * 2, 8));
        for (let index = 0; index < size; index++) {
            nextBuffer[index] = buffer[(head + index) % buffer.length];
        }
        buffer = nextBuffer;
        head = 0;
    }

    function takeValue(): T {
        const value = buffer[head] as T;
        buffer[head] = undefined;
        head = (head + 1) % buffer.length;
        size--;
        if (size === 0) head = 0;
        return value;
    }

    function wakeReader(result: IteratorResult<T>): void {
        const reader = waitingReader;
        waitingReader = undefined;
        reader?.resolve(result);
    }

    function dispose(): void {
        if (disposed) return;
        disposed = true;
        finished = true;
        buffer = [];
        head = 0;
        size = 0;
        wakeReader(createDoneResult());
    }

    function finish(): void {
        if (finished || disposed) return;
        finished = true;
        if (size === 0) wakeReader(createDoneResult());
    }

    function next(): Promise<IteratorResult<T>> {
        if (readInFlight) {
            return Promise.reject(new Error("An async queue iterator allows only one pending next() call."));
        }
        if (size > 0) {
            return Promise.resolve<IteratorResult<T>>({ done: false, value: takeValue() });
        }
        if (finished || disposed) return Promise.resolve(createDoneResult());

        readInFlight = true;
        let resolve!: (result: IteratorResult<T>) => void;
        const pending = new Promise<IteratorResult<T>>((resolvePromise) => {
            resolve = resolvePromise;
        });
        const reader = { resolve };
        waitingReader = reader;
        return pending.then((result) => {
            readInFlight = false;
            if (waitingReader === reader) waitingReader = undefined;
            return result;
        });
    }

    return {
        get size() {
            return size;
        },
        enqueue(item) {
            if (finished || disposed) {
                throw new Error("Cannot enqueue after the async queue has finished or been disposed.");
            }

            if (waitingReader) {
                wakeReader({ done: false, value: item });
                return;
            }

            if (size === buffer.length) growBuffer();
            buffer[(head + size) % buffer.length] = item;
            size++;
        },
        finish,
        dispose,
        [Symbol.asyncIterator]() {
            if (iteratorAcquired) {
                throw new Error("An async queue supports only one iterator for its lifetime.");
            }
            iteratorAcquired = true;
            return {
                next,
                return() {
                    dispose();
                    return Promise.resolve(createDoneResult());
                },
            };
        },
    };
}
