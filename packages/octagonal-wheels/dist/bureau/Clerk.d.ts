import { type Inbox, type InboxStateDetail } from "./Inbox.ts";
export declare enum ClerkState {
    IDLE = "idle",
    DISPOSED = "disposed",
    WORKING = "working",
    STALLED = "not-started"
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
export declare const SENTINEL_FINISHED: unique symbol;
export declare const SENTINEL_FLUSH: unique symbol;
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
export declare abstract class ClerkBase<T> {
    _inbox: Inbox<T>;
    _name: string;
    abstract _onPick(item: T): Promise<void>;
    _onSentinel?(item: SENTINELS): Promise<any>;
    _state: ClerkState;
    _totalProcessed: number;
    _totalSuccess: number;
    _totalFailed: number;
    _totalFetched: number;
    _disposed: boolean;
    _disposePromise: {
        promise: Promise<void>;
        resolve: (value: void | PromiseLike<void>) => void;
        reject: (reason?: any) => void;
    };
    get state(): ClerkState;
    constructor(params: ClerkOptionBase<T>);
    get stateDetail(): ClerkStateDetail;
    _onProgress?: (state: ClerkStateDetail) => void;
    onProgress(): void;
    setOnProgress(callback: (state: ClerkStateDetail) => void): void;
    _mainLoop(): Promise<void>;
    dispose(): void;
    get onDisposed(): Promise<void>;
}
export declare class Clerk<T> extends ClerkBase<T> {
    _onPick(item: T): Promise<void>;
    _job: (item: T) => Promise<any>;
    constructor(params: ClerkOption<T>);
}
export declare class ClerkGroup<T, U extends ClerkBase<T>> {
    _clerks: U[];
    _nameBase: string;
    _assigned: Inbox<T>;
    _hiredCount: number;
    _job: (item: T) => Promise<any>;
    _instantiate: (params: ClerkOption<T>) => U;
    constructor(params: ClerkGroupOption<T, U>);
    hireMember(params: ClerkOption<T>): void;
    fireMember(): void;
    adjustMemberCount(count: number): void;
    get stateDetail(): ClerkStateDetail;
    get freeMembers(): number;
    dispose(): void;
}
/**
 * A clerk that making batch of items and posts that to another inbox.
 * Please keep in mind that the interval of consuming results should be realised by `PaceMaker`.
 * @template T - The type of items being processed.
 * @property {ClerkStateDetail} stateDetail - Returns the current state details.
 */
export declare class Porter<T> extends ClerkBase<T> {
    _outgoing: Inbox<T[]>;
    _timeout?: number;
    _maxSize: number;
    _buffer: T[];
    _timeoutTimer: ReturnType<typeof setTimeout> | undefined;
    _flushing: Promise<void>;
    _separateChunk: boolean;
    _flush(): Promise<void>;
    get stateDetail(): ClerkStateDetail;
    _onSentinel(item: SENTINELS): Promise<void>;
    _onPick(item: T): Promise<void>;
    flush(): Promise<void>;
    changeParams(params: {
        timeout?: number;
        maxSize?: number;
    }): Promise<void>;
    constructor(params: {
        from: Inbox<T>;
        to: Inbox<T[]>;
        timeout?: number;
        maxSize: number;
    });
    dispose(): void;
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
export declare class Feeder<T> {
    _hasFinished: boolean;
    _hasStarted: boolean;
    _totalFetched: number;
    _totalProcessed: number;
    _source: Iterable<T> | AsyncIterable<T>;
    _target: Inbox<T>;
    _onProgress?: (state: FeederStateDetail) => void;
    onProgress(): void;
    setOnProgress(callback: (state: FeederStateDetail) => void): void;
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
    });
    _mainLoop(): Promise<void>;
    get stateDetail(): FeederStateDetail;
}
/**
 * a clerk that picks items from an inbox and stores them in a buffer.
 * @template T - The type of items being processed.
 * @property {T[]} result - Returns the buffer of items.
 * @property clear - Clears the buffer.
 * @property drainAndReset - Drains the buffer and resets it.
 */
export declare class Harvester<T> extends ClerkBase<T> {
    _buffer: T[];
    _timeoutTimer: ReturnType<typeof setTimeout> | undefined;
    get result(): T[];
    clear(): void;
    drainAndReset(): T[];
    _onPick(item: T): Promise<void>;
    constructor(params: ClerkOptionBase<T>);
    dispose(): void;
}
export {};
