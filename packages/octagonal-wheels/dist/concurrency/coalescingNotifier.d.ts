import type { DisposableResource } from "../resource.ts";
import { type TimeoutScheduler } from "./deferredAction.ts";
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
export declare function createCoalescingNotifier<T>(options: CoalescingNotifierOptions<T>): CoalescingNotifier<T>;
