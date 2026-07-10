export type QueueNotifier = {
    key: string;
    notify: (result: boolean) => void;
    semaphoreStopper: Promise<SemaphoreReleaser | false>;
    quantity: number;
    memo?: string;
    state: "NONE" | "RUNNING" | "DONE";
    timer?: ReturnType<typeof setTimeout>;
};
export type SemaphoreReleaser = () => void;
export type SemaphoreObject = {
    _acquire(quantity: number, memo: string, timeout: number): Promise<SemaphoreReleaser | false>;
    acquire(quantity?: number, memo?: string): Promise<SemaphoreReleaser>;
    tryAcquire(quantity?: number, timeout?: number, memo?: string): Promise<SemaphoreReleaser | false>;
    peekQueues(): QueueNotifier[];
    setLimit(limit: number): void;
};
/**
 * Semaphore handling lib.
 * @param limit Maximum number that can be acquired.
 * @returns Instance of SemaphoreObject
 * @deprecated Use `semaphore_v2` instead.
 */
export declare function Semaphore(limit: number, onRelease?: (currentQueue: QueueNotifier[]) => Promise<void> | void): SemaphoreObject;
