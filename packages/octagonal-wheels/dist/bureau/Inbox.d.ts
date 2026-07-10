import { type PromiseWithResolvers } from "../promises.ts";
export declare const NOT_AVAILABLE: unique symbol;
export type NOT_AVAILABLE = typeof NOT_AVAILABLE;
export declare const READY_PICK_SIGNAL: unique symbol;
export type READY_PICK_SIGNAL = typeof READY_PICK_SIGNAL;
export declare const READY_POST_SIGNAL: unique symbol;
export type READY_POST_SIGNAL = typeof READY_POST_SIGNAL;
export declare const DISPOSE_ERROR = "Inbox has been disposed";
export declare class SyncInbox<T> {
    _capacity: number;
    _buffer: T[];
    _writeIdx: number;
    _readIdx: number;
    _wrapAroundCount: number;
    _isDisposed: boolean;
    _disposedPromise: PromiseWithResolvers<void>;
    constructor(capacity: number);
    /**
     * The number of items in the buffer.
     */
    get size(): number;
    /**
     * The number of free slots in the buffer.
     */
    get free(): number;
    /**
     * Whether the buffer is running out.
     */
    get isRunningOut(): boolean;
    /**
     * Whether the buffer is full.
     */
    get isFull(): boolean;
    /**
     * Whether the buffer is ready to be picked.
     */
    get isReady(): boolean;
    get isDisposed(): boolean;
    get onDisposed(): Promise<void>;
    __fixIdx(): void;
    get state(): InboxStateDetail;
    dispose(): void;
    __onPosted(): void;
    __onPicked(): void;
    __onProgress(): void;
    /**
     * Tries to post an item to the buffer.
     * @param item The item to post.
     * @returns whether the item is posted. `false` if the buffer is full.
     */
    tryPost(item: T): boolean;
    /**
     * Tries to cancel the last posted item.
     * @returns The item picked, or `NOT_AVAILABLE` if no item is available.
     */
    tryCancelPost(): typeof NOT_AVAILABLE | T;
    /**
     * Tries to pick an item from the buffer.
     * @returns The item picked, or `NOT_AVAILABLE` if no item is available.
     */
    tryPick(): T | NOT_AVAILABLE;
}
export declare class Inbox<T> extends SyncInbox<T> {
    _lockFull: PromiseWithResolvers<READY_POST_SIGNAL> | undefined;
    _lockReady: PromiseWithResolvers<READY_PICK_SIGNAL> | undefined;
    /**
     * Creates a new PostBox.
     * @param capacity The capacity of the buffer.
     */
    constructor(capacity: number);
    _waitForFree(): Promise<READY_POST_SIGNAL>;
    _notifyFree(): void;
    _waitForReady(): Promise<READY_PICK_SIGNAL>;
    _notifyReady(): void;
    __onPosted(): void;
    __onPicked(): void;
    dispose(): void;
    /**
     * Posts an item to the buffer.
     * Waits until a slot is available.
     * @param item The item to post.
     * @param timeout The timeout in milliseconds.
     * @param cancellation The promise that cancels the operation.
     * @returns whether the item is posted.
     */
    post(item: T, timeout?: number, cancellation?: Promise<any>[]): Promise<boolean>;
    /**
     * Picks an item from the buffer.
     * Waits until an item is available.
     * @param timeout The timeout in milliseconds.
     * @param cancellation The promise that cancels the operation.
     * @returns The item picked.
     */
    pick(timeout?: number, cancellation?: Promise<any>[]): Promise<T | NOT_AVAILABLE>;
}
export declare const EVENT_PROGRESS = "progress";
export type InboxStateDetail = {
    processed: number;
    size: number;
    free: number;
    isFull: boolean;
    isRunningOut: boolean;
    isReady: boolean;
};
export declare class InboxWithEvent<T> extends Inbox<T> {
    _callback?: (detail: InboxStateDetail) => void;
    constructor(capacity: number, onProgress?: (detail: InboxStateDetail) => void);
    _processed: number;
    __onProgress(): void;
    setOnProgress(callback: (detail: InboxStateDetail) => void): void;
}
