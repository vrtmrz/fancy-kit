import { promiseWithResolvers } from '../promises.js';

/**
 * A semaphore that can be awaited until it is free.
 * It can be locked and freed.
 * When locked, the `nextFree` promise will not resolve until it is freed.
 * It can be aborted with an AbortController.
 */
class WaitSemaphore {
    /**
     * Creates a WaitSemaphore.
     * @param ac AbortController to abort waiting for free state
     */
    constructor(ac) {
        Object.defineProperty(this, "resultPromise", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "ac", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_isFree", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        this.ac = ac || new AbortController();
        this.ac.signal.addEventListener("abort", () => {
            if (this.resultPromise) {
                this.resultPromise.reject(new Error("Aborted"));
                this.resultPromise = null;
            }
        });
    }
    /**
     * Indicates whether the semaphore is free.
     */
    get isFree() {
        return this._isFree;
    }
    /**
     * Promise that resolves when the semaphore is free.
     * If the semaphore is already free, it resolves immediately.
     */
    get nextFree() {
        if (this._isFree) {
            return Promise.resolve();
        }
        if (!this.resultPromise) {
            this.resultPromise = promiseWithResolvers();
        }
        return this.resultPromise.promise;
    }
    /**
     * Locks the semaphore.
     */
    lock() {
        this._isFree = false;
    }
    /**
     * Frees the semaphore, resolving the `nextFree` promise.
     */
    free() {
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
class BulkBase {
    /**
     * Aborts the batching/streaming process.
     */
    abort() {
        if (!this.ac.signal.aborted) {
            this.ac.abort();
        }
    }
    /**
     * Indicates whether the process has been aborted.
     */
    get isAborted() {
        return this.ac.signal.aborted;
    }
    /**
     * Disables the concurrency control.
     */
    disableControl() {
        this.unlocked = true;
        this.checkFlags();
    }
    /**
     * Enables the concurrency control.
     */
    enableControl() {
        this.unlocked = false;
        this.checkFlags();
    }
    /**
     * Creates a BindBase instance.
     * @param ac AbortController to abort the batching/streaming process
     */
    constructor(ac) {
        Object.defineProperty(this, "ac", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "buffer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /**
         * Semaphore indicating whether items can be yielded.
         */
        Object.defineProperty(this, "yieldFlag", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new WaitSemaphore()
        });
        /**
         * Semaphore indicating whether items can be added (not full).
         */
        Object.defineProperty(this, "freeFlag", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new WaitSemaphore()
        });
        /**
         * If true, disables the concurrency control (always yields immediately but no items can be added).
         */
        Object.defineProperty(this, "unlocked", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        this.ac = ac || new AbortController();
        this.ac.signal.addEventListener("abort", () => {
            this.disableControl();
        });
    }
    /**
     * Checks the free flag and locks it if necessary.
     * @returns void
     */
    checkFree() {
        if (this.unlocked) {
            if (this.freeFlag.isFree) {
                this.freeFlag.lock();
            }
            return;
        }
        if (!this.freeFlag.isFree && !this.isBufferFull) {
            this.freeFlag.free();
        }
        else if (this.freeFlag.isFree && this.isBufferFull) {
            this.freeFlag.lock();
        }
    }
    /**
     * Checks the yielding flag and locks it if necessary.
     * @returns void
     */
    checkYielding() {
        if (this.unlocked) {
            if (!this.yieldFlag.isFree) {
                this.yieldFlag.free();
            }
            return;
        }
        if (!this.yieldFlag.isFree && this.isBufferReady) {
            this.yieldFlag.free();
        }
        else if (this.yieldFlag.isFree && !this.isBufferReady) {
            this.yieldFlag.lock();
        }
    }
    /**
     * Checks both flags.
     */
    checkFlags() {
        this.checkFree();
        this.checkYielding();
    }
    /**
     * Adds an item to the buffer.
     * @param item Item to add to the buffer
     */
    addToBuffer(item) {
        this.buffer.push(item);
        this.onAdd();
        this.checkFlags();
    }
    /**
     * Adds an item to the buffer.
     * @param item Item to add to the buffer
     * @returns void
     */
    async add(item) {
        await this.freeFlag.nextFree;
        this.addToBuffer(item);
        return Promise.resolve();
    }
    /**
     * Yields items from the buffer as an async generator.
     */
    async *yield() {
        do {
            await this.yieldFlag.nextFree;
            this.checkFree();
            const result = this.yieldResult();
            if (this.canYield(result)) {
                yield result;
                this.onYield();
            }
            else {
                this.checkFlags();
            }
        } while (!this.isAborted);
    }
    /**
     * Determines whether the yielded items can be yielded.
     * @param items Items to be yielded
     * @returns True if the items can be yielded, false otherwise (skipped in yielding).
     */
    canYield(items) {
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
 * Batches items and yields them as arrays of a specified size.
 * It respects a maximum capacity for the buffer and can be controlled with an AbortController.
 */
class Batcher extends BulkBase {
    get isBufferFull() {
        return this.buffer.length >= this.capacity;
    }
    /**
     * Creates an instance of the Batcher class.
     * @param param0 Options for the batcher.
     * @param ac AbortController to control the batcher.
     */
    constructor({ batchSize, capacity }, ac) {
        super(ac);
        Object.defineProperty(this, "batchSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "capacity", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: Infinity
        });
        this.batchSize = batchSize;
        this.capacity = capacity || Infinity;
    }
    get isBufferReady() {
        return this.buffer.length >= this.batchSize;
    }
    yieldResult() {
        const items = this.buffer.splice(0, this.batchSize);
        return items;
    }
}
/**
 * Batches items and yields them as arrays of a specified size or after a timeout.
 * It respects a maximum capacity for the buffer and can be controlled with an AbortController.
 */
class BatcherWithTimeout extends Batcher {
    /**
     * Options for the batcher with timeout.
     * @param ac AbortController to control the batcher.
     */
    constructor({ batchSize, capacity, timeoutFromLastYield, timeoutFromLastAdd }, ac) {
        super({ batchSize, capacity }, ac);
        Object.defineProperty(this, "timeoutFromLastYield", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "timeoutIdFromLastYield", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "timeoutFromLastAdd", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "timeoutIdFromLastAdd", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "flushRequested", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        this.timeoutFromLastYield = timeoutFromLastYield || 0;
        this.timeoutFromLastAdd = timeoutFromLastAdd || 0;
    }
    get isBufferReady() {
        return this.flushRequested || super.isBufferReady;
    }
    /**
     * Triggers the timeout for adding items.
     * @returns void
     */
    triggerTimeoutAdd() {
        if (this.timeoutFromLastAdd <= 0)
            return;
        if (this.timeoutIdFromLastAdd)
            clearTimeout(this.timeoutIdFromLastAdd);
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
    triggerTimeoutYield() {
        if (this.timeoutFromLastYield <= 0)
            return;
        if (this.timeoutIdFromLastYield)
            clearTimeout(this.timeoutIdFromLastYield);
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
    canYield(items) {
        return items.length > 0;
    }
    onAdd() {
        this.flushRequested = false;
        this.triggerTimeoutAdd();
    }
    onYield() {
        this.flushRequested = false;
        this.triggerTimeoutYield();
    }
}
/**
 * Streams items one by one from the buffer.
 * It respects a maximum capacity for the buffer and can be controlled with an AbortController.
 */
class Streamer extends BulkBase {
    /**
     * Constructor for the Streamer class.
     * @param param0 Options for the streamer.
     * @param ac AbortController to control the streamer.
     */
    constructor({ capacity }, ac) {
        super(ac);
        Object.defineProperty(this, "capacity", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.buffer = [];
        this.capacity = capacity || Infinity;
    }
    get isBufferFull() {
        return this.buffer.length >= this.capacity;
    }
    get isBufferReady() {
        return true;
    }
    yieldResult() {
        while (this.buffer.length > 0) {
            const currentHead = this.buffer[0];
            if (currentHead.length > 0) {
                return currentHead.shift();
            }
            // current head is empty, remove it
            this.buffer.shift();
        }
        // isBufferReady ensures that buffer is not empty, so this should not happen
        throw new Error("Buffer is run out (this should not happen)");
    }
    canYield(_items) {
        return true;
    }
}

export { Batcher, BatcherWithTimeout, BulkBase, Streamer, WaitSemaphore };
//# sourceMappingURL=bulk.js.map
