/** Proposed preparation adapter; the existing withSemaphore stays unchanged. */
import type { Scope } from "./scope.js";

export interface SemaphoreAcquisition {
    acquire(): PromiseLike<() => void>;
}

/** Acquires once, registers release in the current scope, and preserves T. */
export declare function acquirePermit(semaphore: SemaphoreAcquisition): <T>(ctx: Scope<T>) => Promise<T>;
