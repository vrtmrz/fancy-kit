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
export type ScreenWakeLockEvent = {
    /** A logical lease was added. */
    type: "lease-acquired";
    /** An optional diagnostic label supplied by the caller. */
    label?: string;
    /** The number of logical leases after the change. */
    activeLeaseCount: number;
} | {
    /** A logical lease was removed. */
    type: "lease-released";
    /** An optional diagnostic label supplied by the caller. */
    label?: string;
    /** The number of logical leases after the change. */
    activeLeaseCount: number;
} | {
    /** The platform does not expose a screen wake-lock provider. */
    type: "unsupported";
    /** The number of active logical leases. */
    activeLeaseCount: number;
} | {
    /** A platform wake lock is being requested. */
    type: "wake-lock-requested";
    /** The number of active logical leases. */
    activeLeaseCount: number;
} | {
    /** A platform wake lock is held. */
    type: "wake-lock-acquired";
    /** The number of active logical leases. */
    activeLeaseCount: number;
} | {
    /** A held platform wake lock was released. */
    type: "wake-lock-released";
    /** The cause observed by the manager. */
    reason: ScreenWakeLockReleaseReason;
    /** The number of active logical leases. */
    activeLeaseCount: number;
} | {
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
export declare class ScreenWakeLockManagerDisposedError extends Error {
    /** Creates a disposed-manager error. */
    constructor();
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
export declare function createScreenWakeLockManager(options?: ScreenWakeLockManagerOptions): ScreenWakeLockManager;
