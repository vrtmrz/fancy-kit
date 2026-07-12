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
export declare class StreamInbox<T> {
    readonly readable: ReadableStream<T>;
    private readonly _capacity;
    private readonly _overflowPolicy;
    private readonly _queue;
    private _controller?;
    private _isClosed;
    private _isControllerClosed;
    constructor(options?: StreamInboxOptions);
    get size(): number;
    get free(): number;
    get isFull(): boolean;
    get isClosed(): boolean;
    post(item: T): boolean;
    close(): void;
    error(reason?: unknown): void;
    private _drain;
    private _closeController;
}
export declare function createStreamInbox<T>(options?: StreamInboxOptions): StreamInbox<T>;
