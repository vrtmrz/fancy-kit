/**
 * A semaphore that can be awaited until it is free.
 * It can be locked and freed.
 * When locked, the `nextFree` promise will not resolve until it is freed.
 * It can be aborted with an AbortController.
 */
export declare class WaitSemaphore {
    private resultPromise;
    private ac;
    /**
     * Creates a WaitSemaphore.
     * @param ac AbortController to abort waiting for free state
     */
    constructor(ac?: AbortController);
    private _isFree;
    /**
     * Indicates whether the semaphore is free.
     */
    get isFree(): boolean;
    /**
     * Promise that resolves when the semaphore is free.
     * If the semaphore is already free, it resolves immediately.
     */
    get nextFree(): Promise<void>;
    /**
     * Locks the semaphore.
     */
    lock(): void;
    /**
     * Frees the semaphore, resolving the `nextFree` promise.
     */
    free(): void;
}
/**
 * Base class for batching or streaming items with concurrency control.
 */
export declare abstract class BulkBase<T, U> {
    protected ac: AbortController;
    protected buffer: T[];
    /**
     * Semaphore indicating whether items can be yielded.
     */
    protected yieldFlag: WaitSemaphore;
    /**
     * Semaphore indicating whether items can be added (not full).
     */
    protected freeFlag: WaitSemaphore;
    /**
     * If true, disables the concurrency control (always yields immediately but no items can be added).
     */
    protected unlocked: boolean;
    /**
     * Aborts the batching/streaming process.
     */
    abort(): void;
    /**
     * Indicates whether the process has been aborted.
     */
    get isAborted(): boolean;
    /**
     * Indicates whether the buffer is full (cannot add more items).
     */
    abstract get isBufferFull(): boolean;
    /**
     * Indicates whether the buffer is ready to yield items.
     */
    abstract get isBufferReady(): boolean;
    /**
     * Disables the concurrency control.
     */
    disableControl(): void;
    /**
     * Enables the concurrency control.
     */
    enableControl(): void;
    /**
     * Creates a BindBase instance.
     * @param ac AbortController to abort the batching/streaming process
     */
    constructor(ac?: AbortController);
    /**
     * Checks the free flag and locks it if necessary.
     * @returns void
     */
    protected checkFree(): void;
    /**
     * Checks the yielding flag and locks it if necessary.
     * @returns void
     */
    protected checkYielding(): void;
    /**
     * Checks both flags.
     */
    checkFlags(): void;
    /**
     * Adds an item to the buffer.
     * @param item Item to add to the buffer
     */
    protected addToBuffer(item: T): void;
    /**
     * Adds an item to the buffer.
     * @param item Item to add to the buffer
     * @returns void
     */
    add(item: T): Promise<void>;
    /**
     * gets the result of yielding items from the buffer.
     */
    abstract yieldResult(): U;
    /**
     * Yields items from the buffer as an async generator.
     */
    yield(): AsyncGenerator<U>;
    /**
     * Determines whether the yielded items can be yielded.
     * @param items Items to be yielded
     * @returns True if the items can be yielded, false otherwise (skipped in yielding).
     */
    canYield(items: U): boolean;
    /**
     * Hook called after yielding items.
     */
    onYield(): void;
    /**
     * Hook called after adding an item.
     */
    onAdd(): void;
}
/**
 * Options for Batcher.
 */
export type BatcherOptions = {
    /**
     * Number of items to batch before yielding.
     */
    batchSize: number;
    /**
     * Maximum number of items in the buffer. Defaults to Infinity.
     */
    capacity?: number;
};
/**
 * Batches items and yields them as arrays of a specified size.
 * It respects a maximum capacity for the buffer and can be controlled with an AbortController.
 */
export declare class Batcher<T> extends BulkBase<T, T[]> {
    private batchSize;
    private capacity;
    get isBufferFull(): boolean;
    /**
     * Creates an instance of the Batcher class.
     * @param param0 Options for the batcher.
     * @param ac AbortController to control the batcher.
     */
    constructor({ batchSize, capacity }: BatcherOptions, ac?: AbortController);
    get isBufferReady(): boolean;
    yieldResult(): T[];
}
/**
 * Options for BatcherWithTimeout.
 */
export type BatcherWithTimeoutOptions = BatcherOptions & {
    /**
     * Timeout in milliseconds from the last yield to force yielding the current batch.
     */
    timeoutFromLastYield?: number;
    /**
     * Timeout in milliseconds from the last add to force yielding the current batch.
     */
    timeoutFromLastAdd?: number;
};
/**
 * Batches items and yields them as arrays of a specified size or after a timeout.
 * It respects a maximum capacity for the buffer and can be controlled with an AbortController.
 */
export declare class BatcherWithTimeout<T> extends Batcher<T> {
    private timeoutFromLastYield;
    private timeoutIdFromLastYield;
    private timeoutFromLastAdd;
    private timeoutIdFromLastAdd;
    private flushRequested;
    /**
     * Options for the batcher with timeout.
     * @param ac AbortController to control the batcher.
     */
    constructor({ batchSize, capacity, timeoutFromLastYield, timeoutFromLastAdd }: BatcherWithTimeoutOptions, ac?: AbortController);
    get isBufferReady(): boolean;
    /**
     * Triggers the timeout for adding items.
     * @returns void
     */
    triggerTimeoutAdd(): void;
    /**
     * Triggers the timeout for yielding items.
     * @returns void
     */
    triggerTimeoutYield(): void;
    /**
     * Checks if the items can be yielded.
     * @param items Items to be yielded
     * @returns non-empty array means can yield, empty array means cannot yield (skip yielding).
     */
    canYield(items: T[]): boolean;
    onAdd(): void;
    onYield(): void;
}
/**
 * Options for Streamer.
 */
export type StreamerOptions = {
    /**
     * Maximum number of items in the buffer. Defaults to Infinity.
     */
    capacity?: number;
};
/**
 * Streams items one by one from the buffer.
 * It respects a maximum capacity for the buffer and can be controlled with an AbortController.
 */
export declare class Streamer<T> extends BulkBase<T[], T> {
    private capacity;
    /**
     * Constructor for the Streamer class.
     * @param param0 Options for the streamer.
     * @param ac AbortController to control the streamer.
     */
    constructor({ capacity }: StreamerOptions, ac?: AbortController);
    get isBufferFull(): boolean;
    get isBufferReady(): boolean;
    yieldResult(): T;
    canYield(_items: T): boolean;
}
