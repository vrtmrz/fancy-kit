import type { SemaphoreObject } from "./semaphore_v2.ts";
import type { Scope } from "../resource/scope.ts";
export * from "./semaphore_v2.ts";

/**
 * Runs an operation while holding one semaphore permit, releasing it afterwards.
 *
 * Calls `semaphore.acquire()` with its original receiver and default quantity.
 * The operation starts only after acquisition succeeds. Its synchronous value or
 * asynchronous result is awaited before the acquired release function is called
 * exactly once, whether the operation succeeds or fails.
 *
 * An acquisition failure propagates without calling the operation or a release
 * function. Operation failures propagate unchanged when release succeeds. Release
 * errors follow ordinary `finally` semantics and replace the result or error from
 * the operation. The supplied semaphore retains its queue and concurrency policy.
 *
 * @typeParam T - The resolved operation result.
 * @param semaphore - An existing semaphore or injected acquisition capability.
 * @param operation - Work to start after acquisition; pass a callback so work does
 * not start before the permit is held.
 * @returns A promise for the operation result, settled after release.
 * @example
 * ```ts
 * const semaphore = Semaphore(3);
 * const result = await withSemaphore(semaphore, async () => fetchRecord());
 * ```
 */
export async function withSemaphore<T>(
    semaphore: Pick<SemaphoreObject, "acquire">,
    operation: () => T | PromiseLike<T>
): Promise<T> {
    const release = await semaphore.acquire();
    try {
        return await operation();
    } finally {
        release();
    }
}

/**
 * Minimal semaphore capability accepted by the permit preparation step.
 *
 * Implementations retain their own queue and concurrency policy. Calling
 * acquire without arguments uses that implementation's existing defaults.
 */
export interface SemaphoreAcquisition {
    /** Acquires one permit and resolves to its release function. */
    acquire(): PromiseLike<() => void>;
}

/**
 * Creates a generic preparation step which acquires and defers one permit.
 *
 * The acquisition method is called with its original receiver and no arguments.
 * Once acquisition succeeds, its release function is registered immediately on
 * the supplied scope. Acquisition failures propagate without registering a
 * cleanup. The returned step preserves the current scope value unchanged.
 *
 * Use this step before other preparation whose resources should be released
 * before the permit. Waiting for an existing acquisition is not abortable.
 *
 * @param semaphore - The semaphore used to acquire one permit.
 * @returns A generic scope step which resolves to its unchanged value.
 */
export function acquirePermit(semaphore: SemaphoreAcquisition): <T>(ctx: Scope<T>) => Promise<T> {
    return async <T>(ctx: Scope<T>): Promise<T> => {
        const release = await semaphore.acquire();
        ctx.defer(release);
        return ctx.value;
    };
}
