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

interface NoticeEntry {
  notice: Notice;
  hideTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
}

function duration(value: number | false, name: string): number | false {
  if (value === false) return false;
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be a finite non-negative number or false`);
  return value;
}

function noticeIsConnected(notice: Notice): boolean {
  const messageEl = notice.messageEl as HTMLElement & { isShown?: () => boolean };
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
    this.defaultDurationMs = duration(options.defaultDurationMs ?? 5_000, "defaultDurationMs");
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
  show(key: string, message: KeyedNoticeMessage, options: ShowKeyedNoticeOptions = {}): Notice {
    this.assertActive();
    if (key.length === 0) throw new TypeError("key must not be empty");

    const durationMs = duration(options.durationMs ?? this.defaultDurationMs, "durationMs");
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
      entry.hideTimer = globalThis.setTimeout(() => this.expire(key, scheduledEntry), durationMs);
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
