import type { DisposableResource } from "../resource.ts";

/**
 * Schedules one asynchronous callback and returns its cancellation function.
 *
 * The callback must not run before this function returns. The returned function
 * releases only this registration. Wrap host methods to retain their receiver.
 * Scheduling and cancellation failures are allowed to propagate.
 */
export type TimeoutScheduler = (callback: () => void, delayMs: number) => () => void;

/**
 * Owns at most one pending callback over an explicitly disposable deferred-action lifetime.
 */
export interface DeferredAction extends DisposableResource {
    /**
     * Replaces any pending callback with a new timeout.
     *
     * The delay is passed unchanged to the scheduler. Calls after disposal do
     * nothing. This does not cancel work which the callback has already started.
     */
    schedule(delayMs: number): void;
    /**
     * Cancels the pending registration, allowing a later schedule.
     *
     * Repeated calls without a pending registration do nothing. A cancelled
     * callback remains inactive even if the scheduler later invokes it.
     */
    cancel(): void;
    /**
     * Cancels pending work and permanently prevents further scheduling.
     *
     * Disposal is idempotent. A cancellation failure propagates after the
     * action has become disposed and the pending callback is inactive.
     */
    dispose(): void;
}

const scheduleGlobalTimeout: TimeoutScheduler = (callback, delayMs) => {
    const handle = globalThis.setTimeout(callback, delayMs);
    return () => globalThis.clearTimeout(handle);
};

/**
 * Creates a deferred action for one replaceable, delayed callback.
 *
 * @param callback - The callback to run once when a scheduled timeout expires.
 * @param scheduleTimeout - An injected scheduler. Defaults to the current
 * global timer methods, resolved when scheduling or cancelling.
 * @returns An independent deferred action with no timeout scheduled initially.
 * @remarks
 * Scheduling again cancels the previous registration before creating another.
 * The registration is released before invoking the callback, so the callback
 * may schedule another timeout. Its return value is ignored; exceptions
 * propagate to the scheduler. Scheduling and cancellation failures propagate
 * without retaining an active callback for the failed operation.
 *
 * No host methods are read when this module is imported or a deferred action is
 * created. The injected scheduler determines timing; this deferred action does not
 * track elapsed time or change Promise cancellation semantics.
 * Cancellation during registration also releases the returned registration.
 */
export function createDeferredAction(
    callback: () => void,
    scheduleTimeout: TimeoutScheduler = scheduleGlobalTimeout
): DeferredAction {
    let pending: { cancel?: () => void } | undefined;
    let disposed = false;

    const cancel = () => {
        const current = pending;
        pending = undefined;
        current?.cancel?.();
    };

    return {
        schedule(delayMs) {
            if (disposed) return;
            cancel();
            const current: { cancel?: () => void } = {};
            pending = current;
            try {
                const cancelRegistration = scheduleTimeout(() => {
                    if (pending !== current) return;
                    pending = undefined;
                    callback();
                }, delayMs);
                if (pending === current) current.cancel = cancelRegistration;
                else cancelRegistration();
            } catch (error) {
                if (pending === current) pending = undefined;
                throw error;
            }
        },
        cancel,
        dispose() {
            if (disposed) return;
            disposed = true;
            cancel();
        },
    };
}
