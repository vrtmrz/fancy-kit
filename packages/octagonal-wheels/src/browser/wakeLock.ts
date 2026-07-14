/**
 * The minimal browser capability required to request a screen wake lock.
 *
 * Consumers may inject this interface to test wake-lock behaviour without a
 * browser or to adapt a platform-specific implementation later.
 */
export interface ScreenWakeLockProvider {
    /** Requests a screen wake lock. */
    request(type: "screen"): Promise<ScreenWakeLockSentinel>;
}

/** The minimal wake-lock sentinel contract used by the manager. */
export interface ScreenWakeLockSentinel {
    /** Whether the user agent has already released this sentinel. */
    readonly released: boolean;

    /** Adds a listener for the sentinel's `release` event. */
    addEventListener(type: "release", listener: () => void): void;

    /** Removes a listener previously added for the sentinel's `release` event. */
    removeEventListener(type: "release", listener: () => void): void;

    /** Releases the wake lock represented by this sentinel. */
    release(): Promise<void>;
}

/** The minimal document visibility contract used by the manager. */
export interface ScreenWakeLockDocument {
    /** The current visibility state. A wake lock is requested only while it is `visible`. */
    readonly visibilityState: string;

    /** Adds a document visibility listener. */
    addEventListener(type: "visibilitychange", listener: () => void): void;

    /** Removes a document visibility listener. */
    removeEventListener(type: "visibilitychange", listener: () => void): void;
}

/** Why a held wake-lock sentinel was released by the manager or user agent. */
export type ScreenWakeLockReleaseReason = "idle" | "hidden" | "system" | "disposed";

/** A lifecycle event emitted for diagnostics and test harnesses. */
export type ScreenWakeLockEvent =
    | {
          /** A logical lease was added. */
          type: "lease-acquired";
          /** An optional diagnostic label supplied by the caller. */
          label?: string;
          /** The number of logical leases after the change. */
          activeLeaseCount: number;
      }
    | {
          /** A logical lease was removed. */
          type: "lease-released";
          /** An optional diagnostic label supplied by the caller. */
          label?: string;
          /** The number of logical leases after the change. */
          activeLeaseCount: number;
      }
    | {
          /** The platform does not expose a screen wake-lock provider. */
          type: "unsupported";
          /** The number of active logical leases. */
          activeLeaseCount: number;
      }
    | {
          /** A platform wake lock is being requested. */
          type: "wake-lock-requested";
          /** The number of active logical leases. */
          activeLeaseCount: number;
      }
    | {
          /** A platform wake lock is held. */
          type: "wake-lock-acquired";
          /** The number of active logical leases. */
          activeLeaseCount: number;
      }
    | {
          /** A held platform wake lock was released. */
          type: "wake-lock-released";
          /** The cause observed by the manager. */
          reason: ScreenWakeLockReleaseReason;
          /** The number of active logical leases. */
          activeLeaseCount: number;
      }
    | {
          /** A best-effort platform operation failed. */
          type: "wake-lock-error";
          /** The operation which failed. */
          operation: "request" | "release";
          /** The value rejected or thrown by the platform. */
          error: unknown;
          /** The number of active logical leases. */
          activeLeaseCount: number;
      };

/** Options which apply to one logical wake-lock scope. */
export interface ScreenWakeLockAcquireOptions {
    /**
     * Releases the logical lease when aborted. An already-aborted signal
     * creates an inert, already-released lease.
     */
    signal?: AbortSignal;

    /** An optional label included in diagnostic lifecycle events. */
    label?: string;
}

/** Dependencies and diagnostics for a screen wake-lock manager. */
export interface ScreenWakeLockManagerOptions {
    /**
     * The platform wake-lock provider. When omitted, the provider is resolved
     * from `navigator.wakeLock` when the manager is created. Pass `null` to
     * disable platform acquisition explicitly.
     */
    provider?: ScreenWakeLockProvider | null;

    /**
     * The document visibility source. When omitted, `document` is resolved
     * when the manager is created. Pass `null` when no visibility lifecycle is
     * available.
     */
    document?: ScreenWakeLockDocument | null;

    /**
     * Receives lifecycle events. Exceptions thrown by this observer are
     * ignored so diagnostics cannot alter the protected task.
     */
    onEvent?: (event: ScreenWakeLockEvent) => void;
}

/** A logical request to keep the screen awake. */
export interface ScreenWakeLockLease {
    /** Whether this lease has been disposed or cancelled. */
    readonly released: boolean;

    /** The optional diagnostic label supplied when the lease was acquired. */
    readonly label: string | undefined;

    /**
     * Releases this logical lease. The operation is idempotent. The shared
     * platform wake lock is released after the final logical lease ends.
     */
    dispose(): Promise<void>;
}

/** A reference-counted, best-effort screen wake-lock capability. */
export interface ScreenWakeLockManager {
    /** Whether a platform screen wake-lock provider was available at creation. */
    readonly supported: boolean;

    /** Whether the manager currently holds a platform wake-lock sentinel. */
    readonly held: boolean;

    /** The number of active logical leases. */
    readonly activeLeaseCount: number;

    /**
     * Runs a task while holding a logical wake-lock lease.
     *
     * This closure-based form is the recommended API because it releases the
     * lease in a `finally` block. Platform acquisition is best effort: an
     * unsupported API or a rejected request does not prevent the task from
     * running. Calling this method after manager disposal is an error.
     */
    run<T>(task: () => T | PromiseLike<T>, options?: ScreenWakeLockAcquireOptions): Promise<T>;

    /**
     * Acquires a logical lease for a lifecycle which cannot be represented by
     * one closure. Callers own the returned lease and must dispose it. Prefer
     * {@link run} whenever the protected operation has a bounded callback.
     * Platform acquisition is best effort.
     */
    acquire(options?: ScreenWakeLockAcquireOptions): Promise<ScreenWakeLockLease>;

    /**
     * Permanently disposes the manager, all logical leases, listeners, and any
     * held platform sentinel. The operation is idempotent. Pending platform
     * requests are released if they resolve later.
     */
    dispose(): Promise<void>;
}

/** Thrown when a caller attempts to reuse a disposed manager. */
export class ScreenWakeLockManagerDisposedError extends Error {
    /** Creates a disposed-manager error. */
    constructor() {
        super("The screen wake-lock manager has been disposed");
        this.name = "ScreenWakeLockManagerDisposedError";
    }
}

type ManagedLease = ScreenWakeLockLease & {
    readonly releasedPromise: Promise<void>;
    markReleased(): void;
};

function resolveDefaultProvider(): ScreenWakeLockProvider | null {
    if (typeof navigator === "undefined") return null;
    return (navigator as Navigator & { wakeLock?: ScreenWakeLockProvider }).wakeLock ?? null;
}

function resolveDefaultDocument(): ScreenWakeLockDocument | null {
    if (typeof document === "undefined") return null;
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
export function createScreenWakeLockManager(options: ScreenWakeLockManagerOptions = {}): ScreenWakeLockManager {
    const provider = options.provider === undefined ? resolveDefaultProvider() : options.provider;
    const visibilityDocument = options.document === undefined ? resolveDefaultDocument() : options.document;
    const leases = new Set<ManagedLease>();
    let sentinel: ScreenWakeLockSentinel | null = null;
    let requestInFlight: Promise<void> | null = null;
    let visibilityListenerInstalled = false;
    let disposed = false;

    const emit = (event: ScreenWakeLockEvent): void => {
        try {
            options.onEvent?.(event);
        } catch {
            // Diagnostics must never change the protected operation.
        }
    };

    const canHold = (): boolean =>
        !disposed &&
        leases.size > 0 &&
        (visibilityDocument === null || visibilityDocument.visibilityState === "visible");

    const releaseDetachedSentinel = async (target: ScreenWakeLockSentinel): Promise<void> => {
        if (target.released) return;
        try {
            await target.release();
        } catch (error) {
            emit({
                type: "wake-lock-error",
                operation: "release",
                error,
                activeLeaseCount: leases.size,
            });
        }
    };

    const onSentinelReleased = (): void => {
        if (sentinel === null) return;
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

    const releaseHeldSentinel = async (reason: ScreenWakeLockReleaseReason): Promise<void> => {
        const heldSentinel = sentinel;
        if (heldSentinel === null) return;
        sentinel = null;
        heldSentinel.removeEventListener("release", onSentinelReleased);
        await releaseDetachedSentinel(heldSentinel);
        emit({
            type: "wake-lock-released",
            reason,
            activeLeaseCount: leases.size,
        });
    };

    const ensureHeld = (): Promise<void> => {
        if (!canHold() || sentinel !== null) return Promise.resolve();
        if (provider === null) {
            emit({ type: "unsupported", activeLeaseCount: leases.size });
            return Promise.resolve();
        }
        if (requestInFlight !== null) return requestInFlight;

        emit({ type: "wake-lock-requested", activeLeaseCount: leases.size });
        let platformRequest: Promise<ScreenWakeLockSentinel>;
        try {
            platformRequest = provider.request("screen");
        } catch (error) {
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
            .catch((error: unknown) => {
                emit({
                    type: "wake-lock-error",
                    operation: "request",
                    error,
                    activeLeaseCount: leases.size,
                });
            })
            .finally(() => {
                if (requestInFlight === request) requestInFlight = null;
            });
        requestInFlight = request;
        return request;
    };

    const onVisibilityChange = (): void => {
        if (visibilityDocument?.visibilityState === "visible") {
            void ensureHeld();
        } else {
            void releaseHeldSentinel("hidden");
        }
    };

    const installVisibilityListener = (): void => {
        if (visibilityDocument === null || visibilityListenerInstalled) return;
        visibilityDocument.addEventListener("visibilitychange", onVisibilityChange);
        visibilityListenerInstalled = true;
    };

    const removeVisibilityListener = (): void => {
        if (visibilityDocument === null || !visibilityListenerInstalled) return;
        visibilityDocument.removeEventListener("visibilitychange", onVisibilityChange);
        visibilityListenerInstalled = false;
    };

    const releaseLease = async (lease: ManagedLease): Promise<void> => {
        if (!leases.delete(lease)) return;
        lease.markReleased();
        emit({
            type: "lease-released",
            label: lease.label,
            activeLeaseCount: leases.size,
        });
        if (leases.size !== 0) return;
        removeVisibilityListener();
        await releaseHeldSentinel(disposed ? "disposed" : "idle");
    };

    const manager: ScreenWakeLockManager = {
        get supported(): boolean {
            return provider !== null;
        },
        get held(): boolean {
            return sentinel !== null && !sentinel.released;
        },
        get activeLeaseCount(): number {
            return leases.size;
        },
        async run<T>(task: () => T | PromiseLike<T>, acquireOptions: ScreenWakeLockAcquireOptions = {}): Promise<T> {
            const lease = await manager.acquire(acquireOptions);
            try {
                return await task();
            } finally {
                await lease.dispose();
            }
        },
        async acquire(acquireOptions: ScreenWakeLockAcquireOptions = {}): Promise<ScreenWakeLockLease> {
            if (disposed) throw new ScreenWakeLockManagerDisposedError();

            let released = acquireOptions.signal?.aborted ?? false;
            let abortListener: (() => void) | undefined;
            let resolveReleased: (() => void) | undefined;
            const releasedPromise = new Promise<void>((resolve) => {
                resolveReleased = resolve;
            });
            const lease: ManagedLease = {
                get released(): boolean {
                    return released;
                },
                label: acquireOptions.label,
                releasedPromise,
                markReleased(): void {
                    if (released) return;
                    released = true;
                    if (abortListener !== undefined) {
                        acquireOptions.signal?.removeEventListener("abort", abortListener);
                        abortListener = undefined;
                    }
                    resolveReleased?.();
                    resolveReleased = undefined;
                },
                async dispose(): Promise<void> {
                    if (released) return;
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
        async dispose(): Promise<void> {
            if (disposed) return;
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
