/** Thrown when a caller attempts to reuse a disposed manager. */
class ScreenWakeLockManagerDisposedError extends Error {
    /** Creates a disposed-manager error. */
    constructor() {
        super("The screen wake-lock manager has been disposed");
        this.name = "ScreenWakeLockManagerDisposedError";
    }
}
function resolveDefaultProvider() {
    if (typeof navigator === "undefined")
        return null;
    return navigator.wakeLock ?? null;
}
function resolveDefaultDocument() {
    if (typeof document === "undefined")
        return null;
    return document;
}
/**
 * Creates a reference-counted screen wake-lock manager.
 *
 * Browser globals are resolved only when this function is called, so importing
 * this module is safe in Node.js and other non-browser runtimes. A screen wake
 * lock prevents display sleep only while the user agent permits it; it does not
 * guarantee background execution or prevent operating-system suspension.
 * Dispose the returned manager when its owning application or plug-in unloads.
 *
 * @example Recommended closure-based usage
 * ```ts
 * import { createScreenWakeLockManager } from "octagonal-wheels/browser/wakeLock";
 *
 * const wakeLock = createScreenWakeLockManager();
 *
 * await wakeLock.run(async () => {
 *     await createBackup();
 * });
 *
 * await wakeLock.dispose();
 * ```
 *
 * @example Explicit lease for a bounded split lifecycle
 * ```ts
 * async function keepForegroundSyncAwake(signal: AbortSignal) {
 *     const lease = await wakeLock.acquire({ signal, label: "foreground-sync" });
 *
 *     try {
 *         await runForegroundSync();
 *     } finally {
 *         await lease.dispose();
 *     }
 * }
 * ```
 */
function createScreenWakeLockManager(options = {}) {
    const provider = options.provider === undefined ? resolveDefaultProvider() : options.provider;
    const visibilityDocument = options.document === undefined ? resolveDefaultDocument() : options.document;
    const leases = new Set();
    let sentinel = null;
    let requestInFlight = null;
    let visibilityListenerInstalled = false;
    let disposed = false;
    const emit = (event) => {
        try {
            options.onEvent?.(event);
        }
        catch {
            // Diagnostics must never change the protected operation.
        }
    };
    const canHold = () => !disposed &&
        leases.size > 0 &&
        (visibilityDocument === null || visibilityDocument.visibilityState === "visible");
    const releaseDetachedSentinel = async (target) => {
        if (target.released)
            return;
        try {
            await target.release();
        }
        catch (error) {
            emit({
                type: "wake-lock-error",
                operation: "release",
                error,
                activeLeaseCount: leases.size,
            });
        }
    };
    const onSentinelReleased = () => {
        if (sentinel === null)
            return;
        const releasedSentinel = sentinel;
        sentinel = null;
        releasedSentinel.removeEventListener("release", onSentinelReleased);
        emit({
            type: "wake-lock-released",
            reason: "system",
            activeLeaseCount: leases.size,
        });
        // A user agent may release a lock for power or policy reasons. Avoid a
        // request loop; a later visibility transition may request it again.
    };
    const releaseHeldSentinel = async (reason) => {
        const heldSentinel = sentinel;
        if (heldSentinel === null)
            return;
        sentinel = null;
        heldSentinel.removeEventListener("release", onSentinelReleased);
        await releaseDetachedSentinel(heldSentinel);
        emit({
            type: "wake-lock-released",
            reason,
            activeLeaseCount: leases.size,
        });
    };
    const ensureHeld = () => {
        if (!canHold() || sentinel !== null)
            return Promise.resolve();
        if (provider === null) {
            emit({ type: "unsupported", activeLeaseCount: leases.size });
            return Promise.resolve();
        }
        if (requestInFlight !== null)
            return requestInFlight;
        emit({ type: "wake-lock-requested", activeLeaseCount: leases.size });
        let platformRequest;
        try {
            platformRequest = provider.request("screen");
        }
        catch (error) {
            emit({
                type: "wake-lock-error",
                operation: "request",
                error,
                activeLeaseCount: leases.size,
            });
            return Promise.resolve();
        }
        const request = platformRequest
            .then(async (acquiredSentinel) => {
            if (!canHold() || acquiredSentinel.released || sentinel !== null) {
                await releaseDetachedSentinel(acquiredSentinel);
                return;
            }
            sentinel = acquiredSentinel;
            acquiredSentinel.addEventListener("release", onSentinelReleased);
            emit({ type: "wake-lock-acquired", activeLeaseCount: leases.size });
        })
            .catch((error) => {
            emit({
                type: "wake-lock-error",
                operation: "request",
                error,
                activeLeaseCount: leases.size,
            });
        })
            .finally(() => {
            if (requestInFlight === request)
                requestInFlight = null;
        });
        requestInFlight = request;
        return request;
    };
    const onVisibilityChange = () => {
        if (visibilityDocument?.visibilityState === "visible") {
            void ensureHeld();
        }
        else {
            void releaseHeldSentinel("hidden");
        }
    };
    const installVisibilityListener = () => {
        if (visibilityDocument === null || visibilityListenerInstalled)
            return;
        visibilityDocument.addEventListener("visibilitychange", onVisibilityChange);
        visibilityListenerInstalled = true;
    };
    const removeVisibilityListener = () => {
        if (visibilityDocument === null || !visibilityListenerInstalled)
            return;
        visibilityDocument.removeEventListener("visibilitychange", onVisibilityChange);
        visibilityListenerInstalled = false;
    };
    const releaseLease = async (lease) => {
        if (!leases.delete(lease))
            return;
        lease.markReleased();
        emit({
            type: "lease-released",
            label: lease.label,
            activeLeaseCount: leases.size,
        });
        if (leases.size !== 0)
            return;
        removeVisibilityListener();
        await releaseHeldSentinel(disposed ? "disposed" : "idle");
    };
    const manager = {
        get supported() {
            return provider !== null;
        },
        get held() {
            return sentinel !== null && !sentinel.released;
        },
        get activeLeaseCount() {
            return leases.size;
        },
        async run(task, acquireOptions = {}) {
            const lease = await manager.acquire(acquireOptions);
            try {
                return await task();
            }
            finally {
                await lease.dispose();
            }
        },
        async acquire(acquireOptions = {}) {
            if (disposed)
                throw new ScreenWakeLockManagerDisposedError();
            let released = acquireOptions.signal?.aborted ?? false;
            let abortListener;
            let resolveReleased;
            const releasedPromise = new Promise((resolve) => {
                resolveReleased = resolve;
            });
            const lease = {
                get released() {
                    return released;
                },
                label: acquireOptions.label,
                releasedPromise,
                markReleased() {
                    if (released)
                        return;
                    released = true;
                    if (abortListener !== undefined) {
                        acquireOptions.signal?.removeEventListener("abort", abortListener);
                        abortListener = undefined;
                    }
                    resolveReleased?.();
                    resolveReleased = undefined;
                },
                async dispose() {
                    if (released)
                        return;
                    await releaseLease(lease);
                },
            };
            if (released) {
                resolveReleased?.();
                resolveReleased = undefined;
                return lease;
            }
            leases.add(lease);
            emit({
                type: "lease-acquired",
                label: lease.label,
                activeLeaseCount: leases.size,
            });
            installVisibilityListener();
            if (acquireOptions.signal !== undefined) {
                abortListener = () => {
                    void lease.dispose();
                };
                acquireOptions.signal.addEventListener("abort", abortListener, { once: true });
            }
            await Promise.race([ensureHeld(), lease.releasedPromise]);
            return lease;
        },
        async dispose() {
            if (disposed)
                return;
            disposed = true;
            removeVisibilityListener();
            const ownedLeases = [...leases];
            for (const lease of ownedLeases) {
                await releaseLease(lease);
            }
            await releaseHeldSentinel("disposed");
        },
    };
    return manager;
}

export { ScreenWakeLockManagerDisposedError, createScreenWakeLockManager };
//# sourceMappingURL=wakeLock.js.map
