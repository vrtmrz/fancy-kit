import { promiseWithResolvers, isSomeResolved, cancelableDelay } from '../promises.js';

const NOT_AVAILABLE = Symbol("NotAvailable");
const READY_PICK_SIGNAL = Symbol("lockReady");
const READY_POST_SIGNAL = Symbol("lockFull");
const DISPOSE_ERROR = "Inbox has been disposed";
class SyncInbox {
    constructor(capacity) {
        Object.defineProperty(this, "_capacity", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_buffer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // Read from head, write to tail.
        Object.defineProperty(this, "_writeIdx", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "_readIdx", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "_wrapAroundCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "_isDisposed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_disposedPromise", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: promiseWithResolvers()
        });
        if (capacity <= 0) {
            throw new Error("Capacity must be greater than 0");
        }
        this._capacity = ~~capacity;
        let i = 256;
        while (i < capacity + 1) {
            i *= 2;
        }
        i--;
        // i = 2^n - 1
        // if capacity = 4, wrapAroundCount = 7
        // 4: 0b100
        // 7: 0b111
        // Using bitwise AND operation for performance instead of mathematical modulo calculation.
        this._wrapAroundCount = i;
        this._buffer = new Array(i);
        this._writeIdx = 0;
        this._readIdx = 0;
    }
    /**
     * The number of items in the buffer.
     */
    get size() {
        return this._writeIdx - this._readIdx;
    }
    /**
     * The number of free slots in the buffer.
     */
    get free() {
        return this._capacity - this.size;
    }
    /**
     * Whether the buffer is running out.
     */
    get isRunningOut() {
        return this._writeIdx == this._readIdx;
    }
    /**
     * Whether the buffer is full.
     */
    get isFull() {
        return this.free == 0;
    }
    /**
     * Whether the buffer is ready to be picked.
     */
    get isReady() {
        return this.free > 0;
    }
    get isDisposed() {
        return this._isDisposed;
    }
    get onDisposed() {
        return this._disposedPromise.promise;
    }
    __fixIdx() {
        // Resetting the index when it reaches the wrap around count to prevent overflow, of both read and write index.
        // This is to prevent the index from overflowing.
        // And it also keeps _writeIdx - _readIdx always positive.
        if (this._readIdx > this._wrapAroundCount) {
            // If the readIdx is greater than the wrapAroundCount, writeIdx is also greater than the wrapAroundCount.
            this._readIdx = this._readIdx & this._wrapAroundCount;
            this._writeIdx = this._writeIdx & this._wrapAroundCount;
        }
    }
    get state() {
        return {
            processed: this._writeIdx,
            size: this.size,
            free: this.free,
            isFull: this.isFull,
            isRunningOut: this.isRunningOut,
            isReady: this.isReady,
        };
    }
    dispose() {
        // Forcefully clear the buffer.
        this._readIdx = 0;
        this._writeIdx = 0;
        this._capacity = 0;
        this._buffer.length = 1;
        this._buffer[0] = undefined;
        this._wrapAroundCount = 1;
        this._isDisposed = true;
        this._disposedPromise.resolve();
    }
    __onPosted() {
        this.__onProgress();
    }
    __onPicked() {
        this.__onProgress();
    }
    __onProgress() {
        this.__fixIdx();
    }
    /**
     * Tries to post an item to the buffer.
     * @param item The item to post.
     * @returns whether the item is posted. `false` if the buffer is full.
     */
    tryPost(item) {
        if (this.isFull) {
            return false;
        }
        this._writeIdx++;
        this._buffer[this._writeIdx & this._wrapAroundCount] = item;
        this.__onPosted();
        return true;
    }
    /**
     * Tries to cancel the last posted item.
     * @returns The item picked, or `NOT_AVAILABLE` if no item is available.
     */
    tryCancelPost() {
        if (this.size == 0) {
            return NOT_AVAILABLE;
        }
        const pointingIdx = this._writeIdx & this._wrapAroundCount;
        const item = this._buffer[pointingIdx];
        this._buffer[pointingIdx] = undefined;
        this._writeIdx--;
        this.__fixIdx();
        return item;
    }
    /**
     * Tries to pick an item from the buffer.
     * @returns The item picked, or `NOT_AVAILABLE` if no item is available.
     */
    tryPick() {
        if (this.isRunningOut) {
            return NOT_AVAILABLE;
        }
        this._readIdx++;
        const pointingIdx = this._readIdx & this._wrapAroundCount;
        const item = this._buffer[pointingIdx];
        this._buffer[pointingIdx] = undefined;
        this.__onPicked();
        return item;
    }
}
class Inbox extends SyncInbox {
    /**
     * Creates a new PostBox.
     * @param capacity The capacity of the buffer.
     */
    constructor(capacity) {
        super(capacity);
        Object.defineProperty(this, "_lockFull", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_lockReady", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
    async _waitForFree() {
        while (this.free == 0) {
            if (!this._lockFull) {
                this._lockFull = promiseWithResolvers();
            }
            return await this._lockFull.promise;
        }
        return READY_POST_SIGNAL;
    }
    _notifyFree() {
        this._lockFull?.resolve(READY_POST_SIGNAL);
        this._lockFull = undefined;
    }
    async _waitForReady() {
        while (this.isRunningOut) {
            if (!this._lockReady) {
                this._lockReady = promiseWithResolvers();
            }
            return await this._lockReady.promise;
        }
        return READY_PICK_SIGNAL;
    }
    _notifyReady() {
        this._lockReady?.resolve(READY_PICK_SIGNAL);
        this._lockReady = undefined;
    }
    __onPosted() {
        super.__onPosted();
        this._notifyReady();
    }
    __onPicked() {
        super.__onPicked();
        this._notifyFree();
    }
    dispose() {
        super.dispose();
        if (this._lockFull) {
            this._lockFull.reject(new Error(DISPOSE_ERROR));
            this._lockFull = undefined;
        }
        if (this._lockReady) {
            this._lockReady.reject(new Error(DISPOSE_ERROR));
            this._lockReady = undefined;
        }
    }
    /**
     * Posts an item to the buffer.
     * Waits until a slot is available.
     * @param item The item to post.
     * @param timeout The timeout in milliseconds.
     * @param cancellation The promise that cancels the operation.
     * @returns whether the item is posted.
     */
    async post(item, timeout, cancellation) {
        if (this._isDisposed) {
            throw new Error(DISPOSE_ERROR);
        }
        do {
            // If cancellation is provided, check if it is resolved.
            // And if it is resolved, return false before actually posting item
            // Possibly we can accept an item and move this check to after tryPost for performance.
            if (cancellation && cancellation.length > 0 && (await isSomeResolved(cancellation))) {
                return false;
            }
            const result = this.tryPost(item);
            if (result) {
                return true;
            }
            // If the buffer is full (that identified by false return from tryPost)
            let p;
            const tasks = [
                this._waitForFree(),
                ...(timeout ? [(p = cancelableDelay(timeout)).promise] : []),
                ...(cancellation ? cancellation : []),
            ];
            const r = await Promise.race(tasks);
            p?.cancel();
            if (r === READY_POST_SIGNAL) {
                // Not full anymore.
                // Probably we can post now.
                continue;
            }
            // Other case, timeout or cancelled by the cancellation promise.
            return false;
        } while (!this._isDisposed);
        // This means the inbox is disposed while waiting, probably by the cancellation promise.
        // deno-lint-ignore no-unreachable
        return false;
    }
    /**
     * Picks an item from the buffer.
     * Waits until an item is available.
     * @param timeout The timeout in milliseconds.
     * @param cancellation The promise that cancels the operation.
     * @returns The item picked.
     */
    async pick(timeout, cancellation) {
        // console.log(`blocking: ${nonBlocking} timeout: ${timeout} cancellation: ${cancellation}`);
        // console.log(`Picking ${this._readIdx} -> ${this._writeIdx} `);
        // console.log(`Size: ${this.size} (${this.free} free)`);
        if (this._isDisposed) {
            throw new Error(DISPOSE_ERROR);
        }
        do {
            // If cancellation is provided, check if it is resolved.
            // And if it is resolved, return NOT_AVAILABLE before actually picking item.
            // Possibly we can accept an item and move this check to after tryPick for performance.
            if (cancellation && cancellation.length > 0 && (await isSomeResolved(cancellation))) {
                return NOT_AVAILABLE;
            }
            const item = this.tryPick();
            if (item !== NOT_AVAILABLE) {
                return item;
            }
            // Begin waiting for the buffer to be ready.
            let p;
            const tasks = [
                this._waitForReady(),
                ...(timeout ? [(p = cancelableDelay(timeout)).promise] : []),
                ...(cancellation ? cancellation : []),
            ];
            // console.log(tasks);
            const r = await Promise.race(tasks);
            // console.log(`Tasks!:${String(r)}`);
            p?.cancel();
            if (r === READY_PICK_SIGNAL) {
                // Not running out anymore.
                // Probably we can pick now.
                continue;
            }
            // Cancelled by the cancellation promise.
            return NOT_AVAILABLE;
        } while (!this.isDisposed);
        // This means the inbox is disposed while waiting, probably by the cancellation promise.
        // deno-lint-ignore no-unreachable
        return NOT_AVAILABLE;
    }
}
const EVENT_PROGRESS = "progress";
class InboxWithEvent extends Inbox {
    constructor(capacity, onProgress) {
        super(capacity);
        Object.defineProperty(this, "_callback", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_processed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        this._callback = onProgress;
    }
    __onProgress() {
        this._processed++;
        const event = new CustomEvent(EVENT_PROGRESS, {
            detail: this.state,
        });
        this._callback?.(event.detail);
    }
    setOnProgress(callback) {
        this._callback = callback;
    }
}

export { DISPOSE_ERROR, EVENT_PROGRESS, Inbox, InboxWithEvent, NOT_AVAILABLE, READY_PICK_SIGNAL, READY_POST_SIGNAL, SyncInbox };
//# sourceMappingURL=Inbox.js.map
