export type StreamInboxOverflowPolicy = "reject" | "drop-newest";

export type StreamInboxOptions = {
    /**
     * Maximum number of items retained by this bridge, including items already
     * handed to the ReadableStream internal queue.
     */
    capacity?: number;
    overflowPolicy?: StreamInboxOverflowPolicy;
};

/**
 * A small bridge from callback/event-emitter style producers to ReadableStream consumers.
 *
 * Unlike a WritableStream writer, post() is intentionally synchronous. Some producers
 * such as EventEmitter and PouchDB replication callbacks cannot observe backpressure,
 * so this class reports overflow immediately instead of building an unbounded chain of
 * pending write promises.
 */
export class StreamInbox<T> {
    readonly readable: ReadableStream<T>;
    private readonly _capacity: number;
    private readonly _overflowPolicy: StreamInboxOverflowPolicy;
    private readonly _queue: T[] = [];
    private _controller?: ReadableStreamDefaultController<T>;
    private _isClosed = false;
    private _isControllerClosed = false;

    constructor(options: StreamInboxOptions = {}) {
        const capacity = options.capacity ?? 1;
        if (capacity <= 0) throw new TypeError("capacity must be greater than 0");
        this._capacity = capacity;
        this._overflowPolicy = options.overflowPolicy ?? "reject";
        // The stream may buffer internally, so size/free account for desiredSize below.
        this.readable = new ReadableStream<T>(
            {
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
            },
            { highWaterMark: capacity }
        );
    }

    get size(): number {
        // Count both our pre-stream queue and the ReadableStream internal queue.
        const desiredSize = this._controller?.desiredSize ?? this._capacity;
        const streamQueued = Math.max(0, this._capacity - desiredSize);
        return this._queue.length + streamQueued;
    }

    get free(): number {
        return this._capacity - this.size;
    }

    get isFull(): boolean {
        return this.free <= 0;
    }

    get isClosed(): boolean {
        return this._isClosed;
    }

    post(item: T): boolean {
        if (this._isClosed) return false;
        if (!this.isFull) {
            this._queue.push(item);
            this._drain();
            return true;
        }
        // "drop-oldest" is deliberately absent: once an item is in the
        // ReadableStream internal queue, the stream API cannot remove it.
        if (this._overflowPolicy === "drop-newest") return false;
        return false;
    }

    close(): void {
        if (this._isClosed) return;
        this._isClosed = true;
        this._drain();
        if (this._queue.length === 0) {
            this._closeController();
        }
    }

    error(reason?: unknown): void {
        if (this._isClosed) return;
        this._isClosed = true;
        this._queue.length = 0;
        this._controller?.error(reason);
    }

    private _drain(): void {
        if (!this._controller) return;
        while (this._queue.length !== 0 && (this._controller.desiredSize ?? 0) > 0) {
            const item = this._queue[0];
            this._queue.shift();
            this._controller.enqueue(item);
        }
        if (this._isClosed && this._queue.length === 0) {
            this._closeController();
        }
    }

    private _closeController(): void {
        if (this._isControllerClosed) return;
        this._isControllerClosed = true;
        this._controller?.close();
    }
}

export function createStreamInbox<T>(options?: StreamInboxOptions): StreamInbox<T> {
    return new StreamInbox<T>(options);
}
