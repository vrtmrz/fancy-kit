import type { DisposableResource } from "../resource.ts";
import { createDeferredAction, type TimeoutScheduler } from "./deferredAction.ts";

/** Delivers the latest pending update when a count or waiting limit is reached. */
export interface CoalescingNotifier<T> extends DisposableResource {
    /** Records the latest value. Calls after disposal do nothing. */
    update(value: T): void;
    /** Delivers a pending value immediately; does nothing when none is pending. */
    flush(): void;
    /** Cancels the pending notification and permanently stops accepting updates. */
    dispose(): void;
}

/** Count and waiting limits for one independently owned notifier. */
export interface CoalescingNotifierOptions<T> {
    /** Receives the latest value synchronously. Its return value is ignored. */
    readonly onNotify: (value: T) => void;
    /** Positive integer increase since the last notification; omitted for time-only notification. */
    readonly everyCount?: number;
    /** Maximum wait from the first pending update. Later updates do not postpone it. */
    readonly maxWaitMs?: number;
    /** Extracts a cumulative, non-decreasing count. Without it, each update counts as one. */
    readonly getCount?: (value: T) => number;
    /** Delivers the first update immediately. Defaults to false. */
    readonly leading?: boolean;
    /** Injects the timer boundary; the default uses the current global timer methods. */
    readonly scheduleTimeout?: TimeoutScheduler;
}

/**
 * Coalesces updates until either their count increase or their waiting limit
 * reaches its threshold. At least one limit must be provided. The count starts
 * at zero; a notification establishes the next count baseline.
 *
 * Values are retained by reference, so callers wanting snapshots should pass
 * fresh values. No timer runs without a pending update. Flush clears the
 * pending value and timer before invoking onNotify, allowing reentrant updates.
 * Callback and scheduler errors propagate and are not retried. A timer-triggered
 * callback error propagates through the scheduler, not an earlier update call.
 * Dispose discards pending work; call flush first when a final update is wanted.
 */
export function createCoalescingNotifier<T>(options: CoalescingNotifierOptions<T>): CoalescingNotifier<T> {
    const { everyCount, maxWaitMs, getCount, onNotify, leading = false } = options;
    if (everyCount === undefined && maxWaitMs === undefined) {
        throw new TypeError("A count or waiting limit is required");
    }
    if (everyCount !== undefined && (!Number.isInteger(everyCount) || everyCount <= 0)) {
        throw new RangeError("everyCount must be a positive integer");
    }
    if (maxWaitMs !== undefined && (!Number.isFinite(maxWaitMs) || maxWaitMs < 0)) {
        throw new RangeError("maxWaitMs must be finite and non-negative");
    }

    let pending: { value: T; count: number } | undefined;
    let updateCount = 0;
    let lastNotifiedCount = 0;
    let hasNotified = false;
    let disposed = false;
    const timer = maxWaitMs === undefined ? undefined : createDeferredAction(flush, options.scheduleTimeout);

    function flush() {
        if (disposed || !pending) return;
        const current = pending;
        pending = undefined;
        lastNotifiedCount = current.count;
        hasNotified = true;
        timer?.cancel();
        onNotify(current.value);
    }

    return {
        update(value) {
            if (disposed) return;
            const count = getCount ? getCount(value) : ++updateCount;
            const wasPending = pending !== undefined;
            pending = { value, count };
            if ((leading && !hasNotified) || (everyCount !== undefined && count - lastNotifiedCount >= everyCount)) {
                flush();
            } else if (!wasPending && maxWaitMs !== undefined) {
                timer?.schedule(maxWaitMs);
            }
        },
        flush,
        dispose() {
            if (disposed) return;
            disposed = true;
            pending = undefined;
            timer?.dispose();
        },
    };
}
