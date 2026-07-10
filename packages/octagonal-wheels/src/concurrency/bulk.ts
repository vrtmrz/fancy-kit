import { promiseWithResolvers, type PromiseWithResolvers } from "../promises.ts";

/**
 * A semaphore that can be awaited until it is free.
 * It can be locked and freed.
 * When locked, the `nextFree` promise will not resolve until it is freed.
 * It can be aborted with an AbortController.
 */
export class WaitSemaphore {
    private resultPromise: PromiseWithResolvers<void> | null = null;
    private ac: AbortController;

    /**
     * Creates a WaitSemaphore.
     * @param ac AbortController to abort waiting for free state
     */
    constructor(ac?: AbortController) {
        this.ac = ac || new AbortController();
        this.ac.signal.addEventListener("abort", () => {
            if (this.resultPromise) {
                this.resultPromise.reject(new Error("Aborted"));
                this.resultPromise = null;
            }
        });
    }

    private _isFree: boolean = true;

    /**
     * Indicates whether the semaphore is free.
     */
    get isFree(): boolean {
        return this._isFree;
    }

    /**
     * Promise that resolves when the semaphore is free.
     * If the semaphore is already free, it resolves immediately.
     */
    public get nextFree(): Promise<void> {
        if (this._isFree) {
            return Promise.resolve();
        }
        if (!this.resultPromise) {
            this.resultPromise = promiseWithResolvers<void>();
        }
        return this.resultPromise.promise;
    }

    /**
     * Locks the semaphore.
     */
    public lock(): void {
        this._isFree = false;
    }

    /**
     * Frees the semaphore, resolving the `nextFree` promise.
     */
    public free(): void {
        this._isFree = true;
        if (this.resultPromise) {
            this.resultPromise.resolve();
            this.resultPromise = null;
        }
    }
}

/**
 * Base class for batching or streaming items with concurrency control.
 */
export abstract class BulkBase<T, U> {
    protected ac: AbortController;
    protected buffer: T[] = [];

    /**
     * Semaphore indicating whether items can be yielded.
     */
    protected yieldFlag = new WaitSemaphore();

    /**
     * Semaphore indicating whether items can be added (not full).
     */
    protected freeFlag = new WaitSemaphore();

    /**
     * If true, disables the concurrency control (always yields immediately but no items can be added).
     */
    protected unlocked: boolean = false;

    /**
     * Aborts the batching/streaming process.
     */
    public abort(): void {
        if (!this.ac.signal.aborted) {
            this.ac.abort();
        }
    }

    /**
     * Indicates whether the process has been aborted.
     */
    public get isAborted(): boolean {
        return this.ac.signal.aborted;
    }

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
    public disableControl(): void {
        this.unlocked = true;
        this.checkFlags();
    }

    /**
     * Enables the concurrency control.
     */
    public enableControl(): void {
        this.unlocked = false;
        this.checkFlags();
    }

    /**
     * Creates a BindBase instance.
     * @param ac AbortController to abort the batching/streaming process
     */
    constructor(ac?: AbortController) {
        this.ac = ac || new AbortController();
        this.ac.signal.addEventListener("abort", () => {
            this.disableControl();
        });
    }

    /**
     * Checks the free flag and locks it if necessary.
     * @returns void
     */
    protected checkFree() {
        if (this.unlocked) {
            if (this.freeFlag.isFree) {
                this.freeFlag.lock();
            }
            return;
        }
        if (!this.freeFlag.isFree && !this.isBufferFull) {
            this.freeFlag.free();
        } else if (this.freeFlag.isFree && this.isBufferFull) {
            this.freeFlag.lock();
        }
    }

    /**
     * Checks the yielding flag and locks it if necessary.
     * @returns void
     */
    protected checkYielding() {
        if (this.unlocked) {
            if (!this.yieldFlag.isFree) {
                this.yieldFlag.free();
            }
            return;
        }
        if (!this.yieldFlag.isFree && this.isBufferReady) {
            this.yieldFlag.free();
        } else if (this.yieldFlag.isFree && !this.isBufferReady) {
            this.yieldFlag.lock();
        }
    }

    /**
     * Checks both flags.
     */
    checkFlags(): void {
        this.checkFree();
        this.checkYielding();
    }

    /**
     * Adds an item to the buffer.
     * @param item Item to add to the buffer
     */
    protected addToBuffer(item: T): void {
        this.buffer.push(item);
        this.onAdd();
        this.checkFlags();
    }

    /**
     * Adds an item to the buffer.
     * @param item Item to add to the buffer
     * @returns void
     */
    public async add(item: T): Promise<void> {
        await this.freeFlag.nextFree;
        this.addToBuffer(item);
        return Promise.resolve();
    }

    /**
     * gets the result of yielding items from the buffer.
     */
    abstract yieldResult(): U;

    /**
     * Yields items from the buffer as an async generator.
     */
    async *yield(): AsyncGenerator<U> {
        do {
            await this.yieldFlag.nextFree;
            this.checkFree();
            const result = this.yieldResult();
            if (this.canYield(result)) {
                yield result;
                this.onYield();
            } else {
                this.checkFlags();
            }
        } while (!this.isAborted);
    }

    /**
     * Determines whether the yielded items can be yielded.
     * @param items Items to be yielded
     * @returns True if the items can be yielded, false otherwise (skipped in yielding).
     */
    canYield(items: U): boolean {
        return true;
    }

    /**
     * Hook called after yielding items.
     */
    onYield() {
        // for override
    }

    /**
     * Hook called after adding an item.
     */
    onAdd() {
        // for override
    }
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
export class Batcher<T> extends BulkBase<T, T[]> {
    private batchSize: number;
    private capacity: number = Infinity;

    get isBufferFull(): boolean {
        return this.buffer.length >= this.capacity;
    }

    /**
     * Creates an instance of the Batcher class.
     * @param param0 Options for the batcher.
     * @param ac AbortController to control the batcher.
     */
    constructor({ batchSize, capacity }: BatcherOptions, ac?: AbortController) {
        super(ac);
        this.batchSize = batchSize;
        this.capacity = capacity || Infinity;
    }

    get isBufferReady(): boolean {
        return this.buffer.length >= this.batchSize;
    }

    yieldResult(): T[] {
        const items = this.buffer.splice(0, this.batchSize);
        return items;
    }
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
export class BatcherWithTimeout<T> extends Batcher<T> {
    private timeoutFromLastYield: number;
    private timeoutIdFromLastYield: ReturnType<typeof setTimeout> | null = null;
    private timeoutFromLastAdd: number;
    private timeoutIdFromLastAdd: ReturnType<typeof setTimeout> | null = null;
    private flushRequested: boolean = false;

    /**
     * Options for the batcher with timeout.
     * @param ac AbortController to control the batcher.
     */
    constructor(
        { batchSize, capacity, timeoutFromLastYield, timeoutFromLastAdd }: BatcherWithTimeoutOptions,
        ac?: AbortController
    ) {
        super({ batchSize, capacity }, ac);
        this.timeoutFromLastYield = timeoutFromLastYield || 0;
        this.timeoutFromLastAdd = timeoutFromLastAdd || 0;
    }

    override get isBufferReady(): boolean {
        return this.flushRequested || super.isBufferReady;
    }

    /**
     * Triggers the timeout for adding items.
     * @returns void
     */
    triggerTimeoutAdd(): void {
        if (this.timeoutFromLastAdd <= 0) return;
        if (this.timeoutIdFromLastAdd) clearTimeout(this.timeoutIdFromLastAdd);
        this.timeoutIdFromLastAdd = setTimeout(() => {
            this.timeoutIdFromLastAdd = null;
            this.flushRequested = true;
            this.checkYielding();
        }, this.timeoutFromLastAdd);
    }

    /**
     * Triggers the timeout for yielding items.
     * @returns void
     */
    triggerTimeoutYield(): void {
        if (this.timeoutFromLastYield <= 0) return;
        if (this.timeoutIdFromLastYield) clearTimeout(this.timeoutIdFromLastYield);
        this.timeoutIdFromLastYield = setTimeout(() => {
            this.timeoutIdFromLastYield = null;
            this.flushRequested = true;
            this.checkYielding();
        }, this.timeoutFromLastYield);
    }

    /**
     * Checks if the items can be yielded.
     * @param items Items to be yielded
     * @returns non-empty array means can yield, empty array means cannot yield (skip yielding).
     */
    canYield(items: T[]): boolean {
        return items.length > 0;
    }

    override onAdd(): void {
        this.flushRequested = false;
        this.triggerTimeoutAdd();
    }

    override onYield(): void {
        this.flushRequested = false;
        this.triggerTimeoutYield();
    }
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
export class Streamer<T> extends BulkBase<T[], T> {
    private capacity: number;

    /**
     * Constructor for the Streamer class.
     * @param param0 Options for the streamer.
     * @param ac AbortController to control the streamer.
     */
    constructor({ capacity }: StreamerOptions, ac?: AbortController) {
        super(ac);
        this.buffer = [];
        this.capacity = capacity || Infinity;
    }

    get isBufferFull(): boolean {
        return this.buffer.length >= this.capacity;
    }
    get isBufferReady(): boolean {
        return true;
    }

    yieldResult(): T {
        while (this.buffer.length > 0) {
            const currentHead = this.buffer[0];
            if (currentHead.length > 0) {
                return currentHead.shift()!;
            }
            // current head is empty, remove it
            this.buffer.shift();
        }
        // isBufferReady ensures that buffer is not empty, so this should not happen
        throw new Error("Buffer is run out (this should not happen)");
    }

    canYield(_items: T): boolean {
        return true;
    }
}
