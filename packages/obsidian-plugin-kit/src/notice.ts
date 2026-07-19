import { Notice } from "obsidian";

/** Content accepted by an Obsidian Notice managed by {@link KeyedNoticeManager}. */
export type KeyedNoticeMessage = string | DocumentFragment;

/** Configures defaults for a {@link KeyedNoticeManager}. */
export interface KeyedNoticeManagerOptions {
  /** Default visible duration in milliseconds, or `false` for no automatic hide. Defaults to `5000`. */
  defaultDurationMs?: number | false;
}

/** Configures one call to {@link KeyedNoticeManager.show}. */
export interface ShowKeyedNoticeOptions {
  /** Visible duration in milliseconds, or `false` for no automatic hide. Overrides the manager default. */
  durationMs?: number | false;
}

/** One optional action rendered below a named grouped-Notice message. */
export interface KeyedNoticeGroupAction {
  /** Visible button label. */
  label: string;
  /** Callback invoked when the user selects the action. */
  onSelect: () => void;
}

/** One named row rendered inside a {@link KeyedNoticeGroupManager} Notice. */
export interface KeyedNoticeGroupItem {
  /** Plain-text message for this row. */
  message: string;
  /** Optional full-width action associated with this row. */
  action?: KeyedNoticeGroupAction;
}

/** Configures completion expiry for a {@link KeyedNoticeGroupManager}. */
export interface KeyedNoticeGroupManagerOptions {
  /** Default delay after {@link KeyedNoticeGroupManager.finish}; defaults to `5000`. */
  defaultCompletedDurationMs?: number | false;
}

/** Configures one call to {@link KeyedNoticeGroupManager.finish}. */
export interface FinishKeyedNoticeGroupOptions {
  /** Delay before hiding the completed group, or `false` to keep it visible. */
  durationMs?: number | false;
}

interface NoticeEntry {
  notice: Notice;
  hideTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
}

function duration(value: number | false, name: string): number | false {
  if (value === false) return false;
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError(
      `${name} must be a finite non-negative number or false`,
    );
  return value;
}

function noticeIsConnected(notice: Notice): boolean {
  const messageEl = notice.messageEl as HTMLElement & {
    isShown?: () => boolean;
  };
  if (!messageEl.isConnected) return false;
  return messageEl.isShown?.() ?? true;
}

/**
 * Owns persistent Obsidian Notices addressed by application-defined keys.
 *
 * @remarks
 * Reusing a key updates the existing visible Notice and restarts its expiry.
 * Call {@link dispose} from the owning plug-in's unload lifecycle. A disposed
 * manager cannot show more Notices.
 */
export class KeyedNoticeManager {
  private readonly entries = new Map<string, NoticeEntry>();
  private readonly defaultDurationMs: number | false;
  private disposed = false;

  /** Creates an empty, instance-scoped Notice manager. */
  constructor(options: KeyedNoticeManagerOptions = {}) {
    this.defaultDurationMs = duration(
      options.defaultDurationMs ?? 5_000,
      "defaultDurationMs",
    );
  }

  /** Whether {@link dispose} has permanently ended this manager's lifecycle. */
  get isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Creates or updates the Notice associated with a key.
   *
   * @param key - Non-empty identifier scoped to this manager instance.
   * @param message - Text or fragment passed to Obsidian's Notice API.
   * @param options - Optional expiry override for this update.
   * @returns The active Obsidian Notice. The same instance is returned while a keyed Notice remains connected.
   */
  show(
    key: string,
    message: KeyedNoticeMessage,
    options: ShowKeyedNoticeOptions = {},
  ): Notice {
    this.assertActive();
    if (key.length === 0) throw new TypeError("key must not be empty");

    const durationMs = duration(
      options.durationMs ?? this.defaultDurationMs,
      "durationMs",
    );
    let entry = this.entries.get(key);
    if (entry !== undefined && !noticeIsConnected(entry.notice)) {
      this.clearTimer(entry);
      this.entries.delete(key);
      entry = undefined;
    }

    if (entry === undefined) {
      const notice = new Notice(message, 0);
      notice.messageEl.classList.add("vpk-keyed-notice");
      entry = { notice, hideTimer: undefined };
      this.entries.set(key, entry);
    } else {
      entry.notice.setMessage(message);
    }

    this.clearTimer(entry);
    if (durationMs !== false) {
      const scheduledEntry = entry;
      entry.hideTimer = globalThis.setTimeout(
        () => this.expire(key, scheduledEntry),
        durationMs,
      );
    }
    return entry.notice;
  }

  /** Returns whether the manager currently owns a connected Notice for a key. */
  has(key: string): boolean {
    const entry = this.entries.get(key);
    if (entry === undefined) return false;
    if (noticeIsConnected(entry.notice)) return true;
    this.clearTimer(entry);
    this.entries.delete(key);
    return false;
  }

  /** Hides and forgets one keyed Notice, returning whether an entry existed. */
  hide(key: string): boolean {
    const entry = this.entries.get(key);
    if (entry === undefined) return false;
    this.entries.delete(key);
    this.clearTimer(entry);
    entry.notice.hide();
    return true;
  }

  /** Hides and forgets every Notice while keeping the manager reusable. */
  hideAll(): void {
    const entries = [...this.entries.values()];
    this.entries.clear();
    for (const entry of entries) {
      this.clearTimer(entry);
      entry.notice.hide();
    }
  }

  /** Hides all Notices and permanently ends this manager's lifecycle. */
  dispose(): void {
    if (this.disposed) return;
    this.hideAll();
    this.disposed = true;
  }

  private expire(key: string, entry: NoticeEntry): void {
    if (this.entries.get(key) !== entry) return;
    entry.hideTimer = undefined;
    this.entries.delete(key);
    entry.notice.hide();
  }

  private clearTimer(entry: NoticeEntry): void {
    if (entry.hideTimer === undefined) return;
    globalThis.clearTimeout(entry.hideTimer);
    entry.hideTimer = undefined;
  }

  private assertActive(): void {
    if (this.disposed) throw new Error("KeyedNoticeManager has been disposed");
  }
}

interface NoticeGroupEntry {
  notice: Notice;
  root: HTMLDivElement;
  items: Map<string, KeyedNoticeGroupItem>;
  hideTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  dismissed: boolean;
}

function createGroupRoot(): HTMLDivElement {
  const root = document.createElement("div");
  root.classList.add("vpk-keyed-notice-group");
  Object.assign(root.style, {
    display: "grid",
    gap: "0.75rem",
    maxWidth: "100%",
    overflowWrap: "anywhere",
  });
  return root;
}

function showGroupRoot(root: HTMLDivElement): Notice {
  const fragment = document.createDocumentFragment();
  fragment.append(root);
  return new Notice(fragment, 0);
}

function createGroupEntry(): NoticeGroupEntry {
  const root = createGroupRoot();
  const entry: NoticeGroupEntry = {
    notice: showGroupRoot(root),
    root,
    items: new Map(),
    hideTimer: undefined,
    dismissed: false,
  };
  // Obsidian dismisses a Notice when it is clicked, but can leave its DOM
  // connected during the hide transition. Record that user action in the
  // capture phase so a subsequent update cannot revive acknowledged rows.
  root.addEventListener(
    "click",
    () => {
      entry.dismissed = true;
    },
    { capture: true },
  );
  return entry;
}

function groupEntryIsActive(entry: NoticeGroupEntry): boolean {
  return !entry.dismissed && entry.root.isConnected;
}

function renderGroup(entry: NoticeGroupEntry): void {
  entry.root.replaceChildren();
  let index = 0;
  for (const [itemKey, item] of entry.items) {
    const itemElement = document.createElement("div");
    itemElement.classList.add("vpk-keyed-notice-group__item");
    itemElement.dataset.itemKey = itemKey;
    Object.assign(itemElement.style, {
      display: "grid",
      gap: "0.5rem",
      minWidth: "0",
      paddingTop: index === 0 ? "0" : "0.75rem",
      ...(index === 0
        ? {}
        : { borderTop: "1px solid var(--background-modifier-border)" }),
    });

    const messageElement = document.createElement("div");
    messageElement.classList.add("vpk-keyed-notice-group__message");
    messageElement.textContent = item.message;
    itemElement.append(messageElement);

    if (item.action !== undefined) {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.add("vpk-keyed-notice-group__action");
      button.textContent = item.action.label;
      Object.assign(button.style, {
        height: "auto",
        maxWidth: "100%",
        minHeight: "max(var(--input-height), 44px)",
        whiteSpace: "normal",
        width: "100%",
      });
      button.addEventListener("click", item.action.onSelect);
      itemElement.append(button);
    }

    entry.root.append(itemElement);
    index += 1;
  }
}

/**
 * Owns one Obsidian Notice per group key and several named rows within it.
 *
 * @remarks
 * Calling {@link setItem} keeps the group active and cancels a pending
 * completion expiry. Rows retain insertion order; updating an item key changes
 * that row in place. Call {@link finish} when no more updates are expected, and
 * call {@link dispose} from the owning plug-in's unload lifecycle.
 *
 * The manager retains the DOM root it passes to Obsidian instead of reading
 * newer Notice element properties. This keeps the implementation compatible
 * with hosts whose Notice API accepts a `DocumentFragment` but does not yet
 * expose `messageEl`.
 */
export class KeyedNoticeGroupManager {
  private readonly groups = new Map<string, NoticeGroupEntry>();
  private readonly defaultCompletedDurationMs: number | false;
  private disposed = false;

  /** Creates an empty, instance-scoped grouped Notice manager. */
  constructor(options: KeyedNoticeGroupManagerOptions = {}) {
    this.defaultCompletedDurationMs = duration(
      options.defaultCompletedDurationMs ?? 5_000,
      "defaultCompletedDurationMs",
    );
  }

  /** Whether {@link dispose} has permanently ended this manager's lifecycle. */
  get isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Creates or updates one named row and returns the group's active Notice.
   *
   * Reusing an item key updates its existing row without changing its order.
   * After the user dismisses a Notice, the next update starts a fresh group so
   * acknowledged rows are not shown again.
   */
  setItem(
    groupKey: string,
    itemKey: string,
    item: KeyedNoticeGroupItem,
  ): Notice {
    this.assertActive();
    this.assertKey(groupKey, "groupKey");
    this.assertKey(itemKey, "itemKey");
    if (item.action !== undefined && item.action.label.length === 0) {
      throw new TypeError("action label must not be empty");
    }

    let entry = this.groups.get(groupKey);
    if (entry === undefined) {
      entry = createGroupEntry();
      this.groups.set(groupKey, entry);
    } else {
      this.clearTimer(entry);
      if (!groupEntryIsActive(entry)) {
        entry.notice.hide();
        entry = createGroupEntry();
        this.groups.set(groupKey, entry);
      }
    }

    entry.items.set(itemKey, {
      message: item.message,
      ...(item.action === undefined ? {} : { action: item.action }),
    });
    renderGroup(entry);
    return entry.notice;
  }

  /** Schedules expiry for a completed group, returning whether it existed. */
  finish(
    groupKey: string,
    options: FinishKeyedNoticeGroupOptions = {},
  ): boolean {
    this.assertActive();
    this.assertKey(groupKey, "groupKey");
    const entry = this.groups.get(groupKey);
    if (entry === undefined) return false;
    if (!groupEntryIsActive(entry)) {
      this.groups.delete(groupKey);
      this.clearTimer(entry);
      entry.notice.hide();
      return false;
    }

    const durationMs = duration(
      options.durationMs ?? this.defaultCompletedDurationMs,
      "durationMs",
    );
    this.clearTimer(entry);
    if (durationMs !== false) {
      entry.hideTimer = globalThis.setTimeout(
        () => this.expire(groupKey, entry),
        durationMs,
      );
    }
    return true;
  }

  /** Removes one named row, hiding the group when no rows remain. */
  removeItem(groupKey: string, itemKey: string): boolean {
    const entry = this.groups.get(groupKey);
    if (entry !== undefined && !groupEntryIsActive(entry)) {
      this.groups.delete(groupKey);
      this.clearTimer(entry);
      entry.notice.hide();
      return false;
    }
    if (entry === undefined || !entry.items.delete(itemKey)) return false;
    if (entry.items.size === 0) {
      this.hide(groupKey);
      return true;
    }
    renderGroup(entry);
    return true;
  }

  /** Returns whether the manager owns a connected Notice for a group key. */
  has(groupKey: string): boolean {
    const entry = this.groups.get(groupKey);
    if (entry === undefined) return false;
    if (groupEntryIsActive(entry)) return true;
    this.groups.delete(groupKey);
    this.clearTimer(entry);
    entry.notice.hide();
    return false;
  }

  /** Hides and forgets one grouped Notice. */
  hide(groupKey: string): boolean {
    const entry = this.groups.get(groupKey);
    if (entry === undefined) return false;
    this.groups.delete(groupKey);
    this.clearTimer(entry);
    entry.notice.hide();
    return true;
  }

  /** Hides and forgets every grouped Notice while keeping the manager reusable. */
  hideAll(): void {
    const entries = [...this.groups.values()];
    this.groups.clear();
    for (const entry of entries) {
      this.clearTimer(entry);
      entry.notice.hide();
    }
  }

  /** Hides every group and permanently ends this manager's lifecycle. */
  dispose(): void {
    if (this.disposed) return;
    this.hideAll();
    this.disposed = true;
  }

  private expire(groupKey: string, entry: NoticeGroupEntry): void {
    if (this.groups.get(groupKey) !== entry) return;
    entry.hideTimer = undefined;
    this.groups.delete(groupKey);
    entry.notice.hide();
  }

  private clearTimer(entry: NoticeGroupEntry): void {
    if (entry.hideTimer === undefined) return;
    globalThis.clearTimeout(entry.hideTimer);
    entry.hideTimer = undefined;
  }

  private assertKey(value: string, name: string): void {
    if (value.length === 0) throw new TypeError(`${name} must not be empty`);
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error("KeyedNoticeGroupManager has been disposed");
    }
  }
}
