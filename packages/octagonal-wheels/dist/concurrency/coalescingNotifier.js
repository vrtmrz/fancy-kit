import { createDeferredAction } from './deferredAction.js';

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
 *
 * @example Connect coalesced updates to the value-less notifier:
 * import { createNotifier } from "octagonal-wheels/concurrency/notifier";
 * const signal = createNotifier();
 * const progress = createCoalescingNotifier({ everyCount: 10, onNotify: signal.notify });
 *
 * @param options - Count, timing, and callback options for this notifier.
 * @returns An independently owned notifier for coalescing update callbacks.
 */
function createCoalescingNotifier(options) {
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
    let pending;
    let updateCount = 0;
    let lastNotifiedCount = 0;
    let hasNotified = false;
    let disposed = false;
    const timer = maxWaitMs === undefined ? undefined : createDeferredAction(flush, options.scheduleTimeout);
    function flush() {
        if (disposed || !pending)
            return;
        const current = pending;
        pending = undefined;
        lastNotifiedCount = current.count;
        hasNotified = true;
        timer?.cancel();
        onNotify(current.value);
    }
    return {
        update(value) {
            if (disposed)
                return;
            const count = getCount ? getCount(value) : ++updateCount;
            const wasPending = pending !== undefined;
            pending = { value, count };
            if ((leading && !hasNotified) || (everyCount !== undefined && count - lastNotifiedCount >= everyCount)) {
                flush();
            }
            else if (!wasPending && maxWaitMs !== undefined) {
                timer?.schedule(maxWaitMs);
            }
        },
        flush,
        dispose() {
            if (disposed)
                return;
            disposed = true;
            pending = undefined;
            timer?.dispose();
        },
    };
}

export { createCoalescingNotifier };
//# sourceMappingURL=coalescingNotifier.js.map
