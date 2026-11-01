function createDoneResult() {
    return { done: true, value: undefined };
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
function createAsyncQueue() {
    let buffer = [];
    let head = 0;
    let size = 0;
    let finished = false;
    let disposed = false;
    let iteratorAcquired = false;
    let readInFlight = false;
    let waitingReader;
    function growBuffer() {
        const nextBuffer = new Array(Math.max(buffer.length * 2, 8));
        for (let index = 0; index < size; index++) {
            nextBuffer[index] = buffer[(head + index) % buffer.length];
        }
        buffer = nextBuffer;
        head = 0;
    }
    function takeValue() {
        const value = buffer[head];
        buffer[head] = undefined;
        head = (head + 1) % buffer.length;
        size--;
        if (size === 0)
            head = 0;
        return value;
    }
    function wakeReader(result) {
        const reader = waitingReader;
        waitingReader = undefined;
        reader?.resolve(result);
    }
    function dispose() {
        if (disposed)
            return;
        disposed = true;
        finished = true;
        buffer = [];
        head = 0;
        size = 0;
        wakeReader(createDoneResult());
    }
    function finish() {
        if (finished || disposed)
            return;
        finished = true;
        if (size === 0)
            wakeReader(createDoneResult());
    }
    function next() {
        if (readInFlight) {
            return Promise.reject(new Error("An async queue iterator allows only one pending next() call."));
        }
        if (size > 0) {
            return Promise.resolve({ done: false, value: takeValue() });
        }
        if (finished || disposed)
            return Promise.resolve(createDoneResult());
        readInFlight = true;
        let resolve;
        const pending = new Promise((resolvePromise) => {
            resolve = resolvePromise;
        });
        const reader = { resolve };
        waitingReader = reader;
        return pending.then((result) => {
            readInFlight = false;
            if (waitingReader === reader)
                waitingReader = undefined;
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
            if (size === buffer.length)
                growBuffer();
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

export { createAsyncQueue };
//# sourceMappingURL=asyncQueue.js.map
