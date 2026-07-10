import { Logger, LOG_LEVEL_VERBOSE } from '../common/logger.js';
import { promiseWithResolvers, yieldMicrotask } from '../promises.js';
import { NOT_AVAILABLE, DISPOSE_ERROR } from './Inbox.js';

var ClerkState;
(function (ClerkState) {
    ClerkState["IDLE"] = "idle";
    ClerkState["DISPOSED"] = "disposed";
    ClerkState["WORKING"] = "working";
    ClerkState["STALLED"] = "not-started";
})(ClerkState || (ClerkState = {}));
const SENTINEL_FINISHED = Symbol("finished");
const SENTINEL_FLUSH = Symbol("flush");
class ClerkBase {
    get state() {
        return this._state;
    }
    constructor(params) {
        Object.defineProperty(this, "_inbox", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_state", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ClerkState.STALLED
        });
        Object.defineProperty(this, "_totalProcessed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "_totalSuccess", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "_totalFailed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "_totalFetched", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "_disposed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_disposePromise", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: promiseWithResolvers()
        });
        Object.defineProperty(this, "_onProgress", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        const { name, assigned } = params;
        this._inbox = assigned;
        this._name = name ?? this.constructor.name;
        void yieldMicrotask().then(() => this._mainLoop());
        void this._inbox.onDisposed.then(() => this.dispose());
    }
    get stateDetail() {
        const hasStarted = this._totalFetched != 0;
        const hasAnyUnprocessed = this._totalFetched != this._totalProcessed;
        const inboxDetail = this._inbox.state;
        const hasAnyInInbox = inboxDetail.size != 0;
        const isBusy = hasAnyInInbox || hasAnyUnprocessed;
        return {
            totalFetched: this._totalFetched,
            inboxDetail: this._inbox.state,
            totalProcessed: this._totalProcessed,
            state: this._state,
            hasStarted: hasStarted,
            isBusy: isBusy,
        };
    }
    onProgress() {
        try {
            this._onProgress?.(this.stateDetail);
        }
        catch {
            // do nothing
        }
    }
    setOnProgress(callback) {
        this._onProgress = callback;
    }
    async _mainLoop() {
        this._state = ClerkState.STALLED;
        this.onProgress();
        await yieldMicrotask();
        do {
            this._state = ClerkState.IDLE;
            this.onProgress();
            try {
                const item = await this._inbox.pick(undefined, [this._disposePromise.promise]);
                if (item === SENTINEL_FLUSH || item === SENTINEL_FINISHED) {
                    await this._onSentinel?.(item);
                    continue;
                }
                if (item === NOT_AVAILABLE) {
                    if (this._inbox.isDisposed) {
                        this._state = ClerkState.DISPOSED;
                        break;
                    }
                    continue;
                }
                this._totalFetched++;
                this._state = ClerkState.WORKING;
                this.onProgress();
                try {
                    await this._onPick(item);
                    this._totalSuccess++;
                }
                catch (ex) {
                    this._totalFailed++;
                    Logger("Error on processing job on clerk");
                    Logger(ex, LOG_LEVEL_VERBOSE);
                }
                this._totalProcessed++;
                this.onProgress();
            }
            catch (ex) {
                if (ex instanceof Error && ex.message !== DISPOSE_ERROR) {
                    Logger("Error on picking item on clerk");
                    Logger(ex, LOG_LEVEL_VERBOSE);
                }
            }
        } while (!this._inbox.isDisposed && !this._disposed);
        this._state = ClerkState.IDLE;
        if (!this._disposed) {
            this.dispose();
        }
        else {
            this._state = ClerkState.DISPOSED;
        }
        this.onProgress();
    }
    dispose() {
        // this._inbox.dispose();
        this._disposePromise.resolve();
        this._disposed = true;
        this._state = ClerkState.DISPOSED;
    }
    get onDisposed() {
        return this._disposePromise.promise;
    }
}
class Clerk extends ClerkBase {
    async _onPick(item) {
        return await this._job(item);
    }
    constructor(params) {
        super(params);
        Object.defineProperty(this, "_job", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._job = params.job;
    }
}
class ClerkGroup {
    constructor(params) {
        Object.defineProperty(this, "_clerks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_nameBase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_assigned", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_hiredCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "_job", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_instantiate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        const { assigned, job, instantiate, initialMemberCount } = params;
        this._assigned = assigned;
        this._instantiate = instantiate;
        this._job = job;
        this._nameBase = params.name ?? this.constructor.name;
        this._clerks = [];
        for (let i = 0; i < initialMemberCount; i++) {
            this.hireMember({ assigned, job });
        }
    }
    hireMember(params) {
        const name = `${this._nameBase}-${this._hiredCount++}`;
        const clerk = this._instantiate({
            name,
            assigned: params.assigned,
            job: params.job,
        });
        this._clerks.push(clerk);
    }
    fireMember() {
        const clerk = this._clerks.pop();
        clerk?.dispose();
    }
    adjustMemberCount(count) {
        const diff = count - this._clerks.length;
        if (diff > 0) {
            for (let i = 0; i < diff; i++) {
                this.hireMember({ assigned: this._assigned, job: this._job });
            }
        }
        else if (diff < 0) {
            for (let i = 0; i < -diff; i++) {
                this.fireMember();
            }
        }
    }
    get stateDetail() {
        const states = this._clerks.map((clerk) => clerk.stateDetail);
        const totalFetched = states.reduce((acc, state) => acc + state.totalFetched, 0);
        const totalProcessed = states.reduce((acc, state) => acc + state.totalProcessed, 0);
        const isBusy = states.some((state) => state.isBusy);
        const hasStarted = states.some((state) => state.hasStarted);
        const inboxDetail = this._assigned.state;
        return {
            totalFetched,
            totalProcessed,
            inboxDetail,
            isBusy,
            hasStarted,
            state: ClerkState.IDLE,
        };
    }
    get freeMembers() {
        return this._clerks.filter((clerk) => clerk.state === ClerkState.IDLE).length;
    }
    dispose() {
        this._clerks.forEach((clerk) => clerk.dispose());
    }
}
/**
 * A clerk that making batch of items and posts that to another inbox.
 * Please keep in mind that the interval of consuming results should be realised by `PaceMaker`.
 * @template T - The type of items being processed.
 * @property {ClerkStateDetail} stateDetail - Returns the current state details.
 */
class Porter extends ClerkBase {
    async _flush() {
        this._timeoutTimer = undefined;
        if (this._buffer.length > 0) {
            const previous = this._outgoing.tryCancelPost();
            if (previous !== NOT_AVAILABLE) {
                if (previous.length >= this._maxSize) {
                    // If previous is full, drawback it to the buffer
                    // We do not care about if the previous post is larger than the max size
                    this._outgoing.tryPost(previous);
                }
                else {
                    // previous is not full, so we need to merge it with the current buffer
                    this._buffer = [...previous, ...this._buffer];
                    // then we need to push the buffer to the max size
                    const filling = this._buffer.splice(0, this._maxSize);
                    // It must be safe that we have canceled the previous post
                    if (this._outgoing.tryPost(filling) === false) {
                        throw new Error("This should not happen");
                    }
                }
            }
            const postingItems = this._buffer.splice(0, this._maxSize);
            if (postingItems.length > 0) {
                await this._outgoing.post(postingItems);
                this.onProgress();
            }
        }
    }
    get stateDetail() {
        const stateDetail = super.stateDetail;
        stateDetail.totalProcessed = this._totalProcessed - this._buffer.length;
        stateDetail.isBusy = stateDetail.isBusy || !!this._timeoutTimer || this._buffer.length > 0;
        return stateDetail;
    }
    async _onSentinel(item) {
        if (item === SENTINEL_FLUSH) {
            await this._flush();
        }
        else if (item === SENTINEL_FINISHED) {
            await this._flush();
            // this.dispose();
        }
    }
    async _onPick(item) {
        this._buffer.push(item);
        if (this._buffer.length >= this._maxSize) {
            await this._flush();
        }
        else {
            if (this._timeout) {
                if (!this._timeoutTimer) {
                    this._timeoutTimer = setTimeout(() => {
                        void this._flush();
                    }, this._timeout);
                }
            }
        }
    }
    flush() {
        return this._flush();
    }
    async changeParams(params) {
        let anyChanged = false;
        if (params.timeout != undefined && this._timeout !== params.timeout) {
            this._timeout = params.timeout;
            anyChanged = true;
        }
        if (params.maxSize != undefined && this._maxSize !== params.maxSize) {
            this._maxSize = params.maxSize;
            anyChanged = true;
        }
        if (anyChanged) {
            await this.flush();
        }
    }
    constructor(params) {
        super({ assigned: params.from });
        Object.defineProperty(this, "_outgoing", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_timeout", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_maxSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_buffer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "_timeoutTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_flushing", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: Promise.resolve()
        });
        Object.defineProperty(this, "_separateChunk", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        this._outgoing = params.to;
        this._timeout = params.timeout;
        this._maxSize = params.maxSize;
    }
    dispose() {
        if (this._timeoutTimer)
            clearTimeout(this._timeoutTimer);
        super.dispose();
    }
}
/**
 * The `Feeder` class is responsible for fetching items from a source and posting them to a target inbox.
 * It supports both synchronous and asynchronous iteration over the source.
 *
 * @template T - The type of items being processed.
 *
 * @property {FeederStateDetail} stateDetail - Returns the current state details of the feeder.
 * @property onProgress - Calls the progress callback with the current state details.
 * @property setOnProgress - Sets the progress callback function.
 *
 * @property _mainLoop - The main loop that fetches items from the source and posts them to the target.
 * @property stateDetail - Returns the current state details of the feeder.
 */
class Feeder {
    onProgress() {
        try {
            this._onProgress?.(this.stateDetail);
        }
        catch {
            // do nothing
        }
    }
    setOnProgress(callback) {
        this._onProgress = callback;
    }
    /**
     *
     * @param {Object} params - The parameters for the feeder.
     * @param {Iterable<T> | AsyncIterable<T>} params.source - The source of items to be processed.
     * @param {Inbox<T>} params.target - The target inbox where items are posted.
     * @param {(state: FeederStateDetail) => void} [params.onProgress] - Optional callback function to report progress.
     */
    constructor(params) {
        Object.defineProperty(this, "_hasFinished", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_hasStarted", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_totalFetched", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "_totalProcessed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "_source", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_target", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_onProgress", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => { }
        });
        const { source, target } = params;
        this._source = source;
        this._target = target;
        void yieldMicrotask().then(() => this._mainLoop());
    }
    async _mainLoop() {
        for await (const item of this._source) {
            if (item === SENTINEL_FINISHED) {
                continue;
            }
            else if (item === SENTINEL_FLUSH) {
                continue;
            }
            this._totalFetched++;
            this._hasStarted = true;
            this.onProgress();
            await this._target.post(item);
            this._totalProcessed++;
            this.onProgress();
        }
        // signal the end of the source
        await this._target.post(SENTINEL_FLUSH);
        await this._target.post(SENTINEL_FINISHED);
        this._hasFinished = true;
        this.onProgress();
    }
    get stateDetail() {
        return {
            hasFinished: this._hasFinished,
            hasStarted: this._hasStarted,
            totalFetched: this._totalFetched,
            totalProcessed: this._totalProcessed,
        };
    }
}
/**
 * a clerk that picks items from an inbox and stores them in a buffer.
 * @template T - The type of items being processed.
 * @property {T[]} result - Returns the buffer of items.
 * @property clear - Clears the buffer.
 * @property drainAndReset - Drains the buffer and resets it.
 */
class Harvester extends ClerkBase {
    get result() {
        return this._buffer;
    }
    clear() {
        this._buffer = [];
    }
    drainAndReset() {
        const result = [...this.result];
        this.clear();
        return result;
    }
    async _onPick(item) {
        this._buffer.push(item);
        return await Promise.resolve();
    }
    constructor(params) {
        super(params);
        Object.defineProperty(this, "_buffer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "_timeoutTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
    dispose() {
        super.dispose();
    }
}

export { Clerk, ClerkBase, ClerkGroup, ClerkState, Feeder, Harvester, Porter, SENTINEL_FINISHED, SENTINEL_FLUSH };
//# sourceMappingURL=Clerk.js.map
