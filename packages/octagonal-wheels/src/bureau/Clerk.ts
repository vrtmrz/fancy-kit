import { LOG_LEVEL_VERBOSE, Logger } from "../common/logger.ts";
import { promiseWithResolvers, yieldMicrotask } from "../promises.ts";
import { DISPOSE_ERROR, type Inbox, NOT_AVAILABLE, type InboxStateDetail } from "./Inbox.ts";

export enum ClerkState {
    IDLE = "idle",
    DISPOSED = "disposed",
    WORKING = "working",
    STALLED = "not-started",
}

export type ClerkOptionBase<T> = {
    name?: string;
    assigned: Inbox<T>;
};

export type ClerkOption<T> = ClerkOptionBase<T> & {
    job: (item: T) => Promise<any> | any;
};

export type ClerkGroupOption<T, U extends ClerkBase<T>> = ClerkOptionBase<T> & {
    job: (item: T) => Promise<any> | any;
    instantiate: (params: ClerkOption<T>) => U;
    initialMemberCount: number;
};

export const SENTINEL_FINISHED = Symbol("finished");
export const SENTINEL_FLUSH = Symbol("flush");

export type SENTINELS = typeof SENTINEL_FINISHED | typeof SENTINEL_FLUSH;

type FeederStateDetail = {
    hasStarted: boolean;
    hasFinished: boolean;
    totalFetched: number;
    totalProcessed: number;
};
type ClerkStateDetail = {
    inboxDetail: InboxStateDetail;
    totalFetched: number;
    totalProcessed: number;
    isBusy: boolean;
    hasStarted: boolean;
    state: ClerkState;
};
export abstract class ClerkBase<T> {
    _inbox: Inbox<T>;
    _name: string;
    abstract _onPick(item: T): Promise<void>;
    _onSentinel?(item: SENTINELS): Promise<any>;

    _state: ClerkState = ClerkState.STALLED;
    _totalProcessed = 0;
    _totalSuccess = 0;
    _totalFailed = 0;
    _totalFetched = 0;
    _disposed = false;
    _disposePromise = promiseWithResolvers<void>();
    get state() {
        return this._state;
    }
    constructor(params: ClerkOptionBase<T>) {
        const { name, assigned } = params;
        this._inbox = assigned;
        this._name = name ?? this.constructor.name;
        void yieldMicrotask().then(() => this._mainLoop());
        void this._inbox.onDisposed.then(() => this.dispose());
    }
    get stateDetail(): ClerkStateDetail {
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

    _onProgress?: (state: ClerkStateDetail) => void;

    onProgress() {
        try {
            this._onProgress?.(this.stateDetail);
        } catch {
            // do nothing
        }
    }
    setOnProgress(callback: (state: ClerkStateDetail) => void) {
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
                    await this._onSentinel?.(item as SENTINELS);
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
                } catch (ex) {
                    this._totalFailed++;
                    Logger("Error on processing job on clerk");
                    Logger(ex, LOG_LEVEL_VERBOSE);
                }
                this._totalProcessed++;
                this.onProgress();
            } catch (ex) {
                if (ex instanceof Error && ex.message !== DISPOSE_ERROR) {
                    Logger("Error on picking item on clerk");
                    Logger(ex, LOG_LEVEL_VERBOSE);
                }
            }
        } while (!this._inbox.isDisposed && !this._disposed);
        this._state = ClerkState.IDLE;
        if (!this._disposed) {
            this.dispose();
        } else {
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

export class Clerk<T> extends ClerkBase<T> {
    async _onPick(item: T): Promise<void> {
        return await this._job(item);
    }

    _job: (item: T) => Promise<any>;

    constructor(params: ClerkOption<T>) {
        super(params);
        this._job = params.job;
    }
}

export class ClerkGroup<T, U extends ClerkBase<T>> {
    _clerks: U[];
    _nameBase: string;
    _assigned: Inbox<T>;
    _hiredCount = 0;
    _job: (item: T) => Promise<any>;
    _instantiate: (params: ClerkOption<T>) => U;

    constructor(params: ClerkGroupOption<T, U>) {
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
    hireMember(params: ClerkOption<T>) {
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
    adjustMemberCount(count: number) {
        const diff = count - this._clerks.length;
        if (diff > 0) {
            for (let i = 0; i < diff; i++) {
                this.hireMember({ assigned: this._assigned, job: this._job });
            }
        } else if (diff < 0) {
            for (let i = 0; i < -diff; i++) {
                this.fireMember();
            }
        }
    }
    get stateDetail(): ClerkStateDetail {
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

export class Porter<T> extends ClerkBase<T> {
    _outgoing: Inbox<T[]>;
    _timeout?: number;
    _maxSize: number;
    _buffer: T[] = [];
    _timeoutTimer: ReturnType<typeof setTimeout> | undefined;
    _flushing = Promise.resolve();
    _separateChunk = false;
    async _flush() {
        this._timeoutTimer = undefined;
        if (this._buffer.length > 0) {
            const previous = this._outgoing.tryCancelPost();
            if (previous !== NOT_AVAILABLE) {
                if (previous.length >= this._maxSize) {
                    // If previous is full, drawback it to the buffer
                    // We do not care about if the previous post is larger than the max size
                    this._outgoing.tryPost(previous);
                } else {
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

    override get stateDetail(): ClerkStateDetail {
        const stateDetail = super.stateDetail;
        stateDetail.totalProcessed = this._totalProcessed - this._buffer.length;
        stateDetail.isBusy = stateDetail.isBusy || !!this._timeoutTimer || this._buffer.length > 0;
        return stateDetail;
    }

    override async _onSentinel(item: SENTINELS) {
        if (item === SENTINEL_FLUSH) {
            await this._flush();
        } else if (item === SENTINEL_FINISHED) {
            await this._flush();
            // this.dispose();
        }
    }

    async _onPick(item: T): Promise<void> {
        this._buffer.push(item);
        if (this._buffer.length >= this._maxSize) {
            await this._flush();
        } else {
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

    async changeParams(params: { timeout?: number; maxSize?: number }) {
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

    constructor(params: { from: Inbox<T>; to: Inbox<T[]>; timeout?: number; maxSize: number }) {
        super({ assigned: params.from });
        this._outgoing = params.to;
        this._timeout = params.timeout;
        this._maxSize = params.maxSize;
    }

    override dispose(): void {
        if (this._timeoutTimer) clearTimeout(this._timeoutTimer);
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
export class Feeder<T> {
    _hasFinished = false;
    _hasStarted = false;
    _totalFetched = 0;
    _totalProcessed = 0;
    _source: Iterable<T> | AsyncIterable<T>;
    _target: Inbox<T>;
    _onProgress?: (state: FeederStateDetail) => void = () => {};
    onProgress() {
        try {
            this._onProgress?.(this.stateDetail);
        } catch {
            // do nothing
        }
    }
    setOnProgress(callback: (state: FeederStateDetail) => void) {
        this._onProgress = callback;
    }

    /**
     *
     * @param {Object} params - The parameters for the feeder.
     * @param {Iterable<T> | AsyncIterable<T>} params.source - The source of items to be processed.
     * @param {Inbox<T>} params.target - The target inbox where items are posted.
     * @param {(state: FeederStateDetail) => void} [params.onProgress] - Optional callback function to report progress.
     */
    constructor(params: {
        source: Iterable<T> | AsyncIterable<T>;
        target: Inbox<T>;
        onProgress?: (state: FeederStateDetail) => void;
    }) {
        const { source, target } = params;
        this._source = source;
        this._target = target;
        void yieldMicrotask().then(() => this._mainLoop());
    }

    async _mainLoop() {
        for await (const item of this._source) {
            if (item === SENTINEL_FINISHED) {
                continue;
            } else if (item === SENTINEL_FLUSH) {
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
        await this._target.post(SENTINEL_FLUSH as any);
        await this._target.post(SENTINEL_FINISHED as any);
        this._hasFinished = true;
        this.onProgress();
    }

    get stateDetail(): FeederStateDetail {
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
export class Harvester<T> extends ClerkBase<T> {
    _buffer: T[] = [];
    _timeoutTimer: ReturnType<typeof setTimeout> | undefined;

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

    async _onPick(item: T): Promise<void> {
        this._buffer.push(item);
        return await Promise.resolve();
    }

    constructor(params: ClerkOptionBase<T>) {
        super(params);
    }

    override dispose(): void {
        super.dispose();
    }
}
