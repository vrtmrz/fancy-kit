const scheduleGlobalTimeout = (callback, delayMs) => {
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
function createDeferredAction(callback, scheduleTimeout = scheduleGlobalTimeout) {
    let pending;
    let disposed = false;
    const cancel = () => {
        const current = pending;
        pending = undefined;
        current?.cancel?.();
    };
    return {
        schedule(delayMs) {
            if (disposed)
                return;
            cancel();
            const current = {};
            pending = current;
            try {
                const cancelRegistration = scheduleTimeout(() => {
                    if (pending !== current)
                        return;
                    pending = undefined;
                    callback();
                }, delayMs);
                if (pending === current)
                    current.cancel = cancelRegistration;
                else
                    cancelRegistration();
            }
            catch (error) {
                if (pending === current)
                    pending = undefined;
                throw error;
            }
        },
        cancel,
        dispose() {
            if (disposed)
                return;
            disposed = true;
            cancel();
        },
    };
}

export { createDeferredAction };
//# sourceMappingURL=deferredAction.js.map
