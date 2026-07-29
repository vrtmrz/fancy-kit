import type {
  UiNotification,
  UiNotifications,
} from "@vrtmrz/ui-interactions";

/** One visible browser notification owned by a presenter. */
export interface BrowserNotificationView {
  /** Whether the rendered notification remains connected to its document. */
  readonly isConnected: boolean;
  /** Replaces the visible notification content. */
  update(notification: UiNotification): void;
  /** Hides the rendered notification. */
  hide(): void;
}

/** Creates browser notification views without owning keyed lifecycle policy. */
export interface BrowserNotificationPresenter {
  /** Creates one visible notification for an application-defined key. */
  create(
    key: string,
    notification: UiNotification,
  ): BrowserNotificationView;
}

/** Configures the default native DOM notification presenter. */
export interface DomBrowserNotificationPresenterOptions {
  /** Document which owns the notification stack. Defaults to the active document. */
  document?: Document;
  /** Element which receives the notification stack. Defaults to `document.body`. */
  container?: HTMLElement;
}

function activeDocument(): Document {
  if (typeof globalThis.document === "undefined") {
    throw new Error("A browser Document is required to present notifications");
  }
  return globalThis.document;
}

class DomBrowserNotificationView implements BrowserNotificationView {
  constructor(
    private readonly root: HTMLDivElement,
    notification: UiNotification,
  ) {
    this.update(notification);
  }

  get isConnected(): boolean {
    return this.root.isConnected;
  }

  update(notification: UiNotification): void {
    const document = this.root.ownerDocument;
    const message = document.createElement("span");
    message.className = "vpk-browser-notification__message";
    message.textContent = notification.message;
    this.root.replaceChildren(message);

    if (notification.action !== undefined) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "vpk-browser-notification__action";
      button.textContent = notification.action.label;
      button.addEventListener("click", notification.action.onSelect);
      this.root.append(button);
    }
  }

  hide(): void {
    const stack = this.root.parentElement;
    this.root.remove();
    if (stack?.childElementCount === 0) stack.remove();
  }
}

/** Framework-free notification presenter backed by native DOM elements. */
export class DomBrowserNotificationPresenter
  implements BrowserNotificationPresenter
{
  private readonly documentOption?: Document;
  private readonly containerOption?: HTMLElement;

  /** Creates a DOM notification presenter. */
  constructor(options: DomBrowserNotificationPresenterOptions = {}) {
    this.documentOption = options.document;
    this.containerOption = options.container;
  }

  /** Creates one visible, accessible notification view. */
  create(
    key: string,
    notification: UiNotification,
  ): BrowserNotificationView {
    const root = this.document.createElement("div");
    root.className = "vpk-browser-notification";
    root.dataset.notificationKey = key;
    root.setAttribute("role", "status");
    Object.assign(root.style, {
      alignItems: "center",
      background: "Canvas",
      border: "1px solid color-mix(in srgb, CanvasText 25%, transparent)",
      borderRadius: "0.5rem",
      boxShadow: "0 0.5rem 1.5rem rgb(0 0 0 / 20%)",
      color: "CanvasText",
      display: "flex",
      gap: "0.75rem",
      justifyContent: "space-between",
      maxWidth: "min(90vw, 32rem)",
      overflowWrap: "anywhere",
      padding: "0.75rem 1rem",
    });
    this.notificationStack().append(root);
    return new DomBrowserNotificationView(root, notification);
  }

  private notificationStack(): HTMLDivElement {
    const existing = [...this.container.children].find(
      (element) =>
        element instanceof this.document.defaultView!.HTMLDivElement &&
        element.dataset.browserNotificationStack === "true",
    );
    if (existing !== undefined) return existing as HTMLDivElement;

    const stack = this.document.createElement("div");
    stack.className = "vpk-browser-notification-stack";
    stack.dataset.browserNotificationStack = "true";
    stack.setAttribute("aria-live", "polite");
    Object.assign(stack.style, {
      display: "grid",
      gap: "0.5rem",
      insetBlockStart: "1rem",
      insetInlineEnd: "1rem",
      maxWidth: "calc(100vw - 2rem)",
      position: "fixed",
      zIndex: "2147483647",
    });
    this.container.append(stack);
    return stack;
  }

  private get document(): Document {
    return this.documentOption ?? activeDocument();
  }

  private get container(): HTMLElement {
    return this.containerOption ?? this.document.body;
  }
}

interface BrowserNotificationEntry {
  view: BrowserNotificationView;
  hideTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
}

function duration(
  value: number | false,
  name: string,
): number | false {
  if (value === false) return false;
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `${name} must be a finite non-negative number or false`,
    );
  }
  return value;
}

/** Configures {@link BrowserUiNotifications}. */
export interface BrowserUiNotificationsOptions
  extends DomBrowserNotificationPresenterOptions {
  /** Presenter override, for framework integration or focused tests. */
  presenter?: BrowserNotificationPresenter;
  /** Default visible duration, or `false` for no automatic hide. Defaults to `5000`. */
  defaultDurationMs?: number | false;
}

/**
 * Presents the neutral keyed notification contract through browser DOM views.
 *
 * Create one instance at the application composition root and dispose it with
 * the owning application lifecycle.
 */
export class BrowserUiNotifications implements UiNotifications {
  private readonly entries = new Map<string, BrowserNotificationEntry>();
  private readonly presenter: BrowserNotificationPresenter;
  private readonly defaultDurationMs: number | false;
  private disposed = false;

  /** Creates an empty, instance-scoped browser notification adapter. */
  constructor(options: BrowserUiNotificationsOptions = {}) {
    this.presenter =
      options.presenter ?? new DomBrowserNotificationPresenter(options);
    this.defaultDurationMs = duration(
      options.defaultDurationMs ?? 5_000,
      "defaultDurationMs",
    );
  }

  /** Whether disposal has permanently ended this adapter's lifecycle. */
  get isDisposed(): boolean {
    return this.disposed;
  }

  /** Creates or updates one keyed browser notification. */
  show(key: string, notification: UiNotification): void {
    this.assertActive();
    if (key.length === 0) throw new TypeError("key must not be empty");
    if (notification.action?.label.length === 0) {
      throw new TypeError("action label must not be empty");
    }

    const durationMs = duration(
      notification.durationMs ?? this.defaultDurationMs,
      "durationMs",
    );
    const presented: UiNotification = {
      ...notification,
      action:
        notification.action === undefined
          ? undefined
          : {
              label: notification.action.label,
              onSelect: () => {
                this.hide(key);
                notification.action?.onSelect();
              },
            },
    };

    let entry = this.entries.get(key);
    if (entry !== undefined && !entry.view.isConnected) {
      this.clearTimer(entry);
      this.entries.delete(key);
      entry = undefined;
    }

    if (entry === undefined) {
      entry = {
        view: this.presenter.create(key, presented),
        hideTimer: undefined,
      };
      this.entries.set(key, entry);
    } else {
      entry.view.update(presented);
    }

    this.clearTimer(entry);
    if (durationMs !== false) {
      const scheduledEntry = entry;
      entry.hideTimer = globalThis.setTimeout(
        () => this.expire(key, scheduledEntry),
        durationMs,
      );
    }
  }

  /** Returns whether this adapter owns a connected view for a key. */
  has(key: string): boolean {
    const entry = this.entries.get(key);
    if (entry === undefined) return false;
    if (entry.view.isConnected) return true;
    this.clearTimer(entry);
    this.entries.delete(key);
    return false;
  }

  /** Hides and forgets one keyed notification. */
  hide(key: string): boolean {
    const entry = this.entries.get(key);
    if (entry === undefined) return false;
    this.entries.delete(key);
    this.clearTimer(entry);
    entry.view.hide();
    return true;
  }

  /** Hides every notification while keeping this adapter reusable. */
  hideAll(): void {
    const entries = [...this.entries.values()];
    this.entries.clear();
    for (const entry of entries) {
      this.clearTimer(entry);
      entry.view.hide();
    }
  }

  /** Hides every notification and permanently ends this adapter's lifecycle. */
  dispose(): void {
    if (this.disposed) return;
    this.hideAll();
    this.disposed = true;
  }

  private expire(key: string, entry: BrowserNotificationEntry): void {
    if (this.entries.get(key) !== entry) return;
    entry.hideTimer = undefined;
    this.entries.delete(key);
    entry.view.hide();
  }

  private clearTimer(entry: BrowserNotificationEntry): void {
    if (entry.hideTimer === undefined) return;
    globalThis.clearTimeout(entry.hideTimer);
    entry.hideTimer = undefined;
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error("BrowserUiNotifications has been disposed");
    }
  }
}

/** Creates a browser implementation of {@link UiNotifications}. */
export function createBrowserUiNotifications(
  options: BrowserUiNotificationsOptions = {},
): UiNotifications {
  return new BrowserUiNotifications(options);
}
