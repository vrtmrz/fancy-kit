export type SemaphoreReleaser = () => void;
export type SemaphoreObject = {
    acquire(quantity?: number): Promise<SemaphoreReleaser>;
    tryAcquire(quantity?: number, timeout?: number): Promise<SemaphoreReleaser | false>;
    waiting: number;
};
export declare function Semaphore(limit: number): SemaphoreObject;
