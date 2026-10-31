import { createNotifierState, notifyNotifierState, waitForNotifierState } from './notifier.internal.js';

/**
 * Creates a notifier with independent state and no notification payload.
 *
 * Notifications do not queue values or counts. A notification with no active
 * waiter is discarded. All current waiters share one promise, which resolves
 * on notification; future waits then use a new promise. The returned methods
 * are safe to pass as callbacks.
 *
 * @returns A notifier with wait and notify operations.
 */
function createNotifier() {
    const state = createNotifierState();
    return {
        wait: () => waitForNotifierState(state),
        notify: () => notifyNotifierState(state),
    };
}

export { createNotifier };
//# sourceMappingURL=notifier.js.map
