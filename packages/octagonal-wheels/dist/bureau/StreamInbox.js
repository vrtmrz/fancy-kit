/**
 * A small bridge from callback/event-emitter style producers to ReadableStream consumers.
 *
 * Unlike a WritableStream writer, post() is intentionally synchronous. Some producers
 * such as EventEmitter and PouchDB replication callbacks cannot observe backpressure,
 * so this class reports overflow immediately instead of building an unbounded chain of
 * pending write promises.
 */
class StreamInbox {
    constructor(options = {}) {
        Object.defineProperty(this, "readable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_capacity", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_overflowPolicy", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_queue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "_controller", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_isClosed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_isControllerClosed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        const capacity = options.capacity ?? 1;
        if (capacity <= 0)
            throw new TypeError("capacity must be greater than 0");
        this._capacity = capacity;
        this._overflowPolicy = options.overflowPolicy ?? "reject";
        // The stream may buffer internally, so size/free account for desiredSize below.
        this.readable = new ReadableStream({
            start: (controller) => {
                this._controller = controller;
                this._drain();
            },
            pull: () => {
                this._drain();
            },
            cancel: () => {
                this._isClosed = true;
                this._queue.length = 0;
            },
        }, { highWaterMark: capacity });
    }
    get size() {
        // Count both our pre-stream queue and the ReadableStream internal queue.
        const desiredSize = this._controller?.desiredSize ?? this._capacity;
        const streamQueued = Math.max(0, this._capacity - desiredSize);
        return this._queue.length + streamQueued;
    }
    get free() {
        return this._capacity - this.size;
    }
    get isFull() {
        return this.free <= 0;
    }
    get isClosed() {
        return this._isClosed;
    }
    post(item) {
        if (this._isClosed)
            return false;
        if (!this.isFull) {
            this._queue.push(item);
            this._drain();
            return true;
        }
        // "drop-oldest" is deliberately absent: once an item is in the
        // ReadableStream internal queue, the stream API cannot remove it.
        if (this._overflowPolicy === "drop-newest")
            return false;
        return false;
    }
    close() {
        if (this._isClosed)
            return;
        this._isClosed = true;
        this._drain();
        if (this._queue.length === 0) {
            this._closeController();
        }
    }
    error(reason) {
        if (this._isClosed)
            return;
        this._isClosed = true;
        this._queue.length = 0;
        this._controller?.error(reason);
    }
    _drain() {
        if (!this._controller)
            return;
        while (this._queue.length !== 0 && (this._controller.desiredSize ?? 0) > 0) {
            const item = this._queue[0];
            this._queue.shift();
            this._controller.enqueue(item);
        }
        if (this._isClosed && this._queue.length === 0) {
            this._closeController();
        }
    }
    _closeController() {
        if (this._isControllerClosed)
            return;
        this._isControllerClosed = true;
        this._controller?.close();
    }
}
function createStreamInbox(options) {
    return new StreamInbox(options);
}

export { StreamInbox, createStreamInbox };
//# sourceMappingURL=StreamInbox.js.map
