/** A notifier whose current waiters share one notification without a payload. */
export interface Notifier {
    /**
     * Waits for the next notification.
     *
     * Calls made before the next notification return the same promise. Each
     * notification resolves only the current group; a wait registered later
     * belongs to a fresh group.
     */
    wait(): Promise<void>;
    /**
     * Resolves the current wait group.
     *
     * Notifications without a current waiter are discarded. This function can
     * be passed as a callback without losing its notifier instance.
     */
    notify(): void;
}
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
export declare function createNotifier(): Notifier;
