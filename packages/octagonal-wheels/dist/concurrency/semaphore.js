export { Semaphore } from './semaphore_v2.js';

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
async function withSemaphore(semaphore, operation) {
    const release = await semaphore.acquire();
    try {
        return await operation();
    }
    finally {
        release();
    }
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
function acquirePermit(semaphore) {
    return async (ctx) => {
        const release = await semaphore.acquire();
        ctx.defer(release);
        return ctx.value;
    };
}

export { acquirePermit, withSemaphore };
//# sourceMappingURL=semaphore.js.map
