/** One optional action attached to a keyed UI notification. */
export interface UiNotificationAction {
  /** Visible action label. It must not be empty. */
  label: string;
  /**
   * Callback invoked after the presenting adapter has hidden the notification.
   *
   * @remarks
   * The callback is synchronous. Start asynchronous application work from the
   * callback without making notification lifecycle depend on its completion.
   */
  onSelect: () => void;
}

/** Content and lifecycle options for one keyed UI notification. */
export interface UiNotification {
  /** Plain-text message displayed by the platform adapter. */
  message: string;
  /** Optional action displayed with the message. */
  action?: UiNotificationAction;
  /**
   * Visible duration in milliseconds, or `false` for no automatic hide.
   *
   * @remarks
   * Omit this field to use the platform adapter's configured default.
   */
  durationMs?: number | false;
}

/**
 * Platform-neutral capability for transient messages addressed by application keys.
 *
 * @remarks
 * Reusing a key updates the existing notification and restarts its expiry.
 * Implementations own their rendered resources until {@link dispose}. A disposed
 * implementation cannot show further notifications.
 */
export interface UiNotifications {
  /** Whether {@link dispose} has permanently ended this instance's lifecycle. */
  readonly isDisposed: boolean;

  /**
   * Creates or updates the notification associated with a non-empty key.
   *
   * @throws {@link TypeError} When the key or an action label is empty.
   * @throws {@link RangeError} When `durationMs` is not finite and non-negative.
   * @throws {@link Error} When the notification capability has been disposed.
   */
  show(key: string, notification: UiNotification): void;

  /** Returns whether this instance currently owns a visible notification for a key. */
  has(key: string): boolean;

  /** Hides and forgets one keyed notification, returning whether it existed. */
  hide(key: string): boolean;

  /** Hides and forgets every notification while keeping this instance reusable. */
  hideAll(): void;

  /** Hides every notification and permanently ends this instance's lifecycle. */
  dispose(): void;
}
