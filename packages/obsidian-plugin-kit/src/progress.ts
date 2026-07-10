import { Notice } from "obsidian";

/** Terminal-aware lifecycle state of a progress indicator. */
export type ProgressState = "running" | "completed" | "cancelled";

/** Immutable value passed to progress formatters and callbacks. */
export interface ProgressSnapshot {
  /** Current progress value. */
  value: number;
  /** Target value. A value of zero represents indeterminate progress. */
  total: number;
  /** Current heading text. */
  title: string;
  /** Current supplementary status text. */
  note: string;
  /** Current lifecycle state. */
  state: ProgressState;
}

/** Configures the initial state, rendering, and lifecycle callbacks of a {@link ProgressFragment}. */
export interface ProgressFragmentOptions {
  /** Initial value. Must be finite and non-negative. Defaults to `0`. */
  value?: number;
  /** Initial target. Zero renders an indeterminate bar. Defaults to `0`. */
  total?: number;
  /** Initial heading text. Defaults to an empty string. */
  title?: string;
  /** Initial supplementary text. Defaults to an empty string. */
  note?: string;
  /** Whether the root element is initially hidden. Defaults to `false`. */
  collapsed?: boolean;
  /**
   * Whether reaching a positive total automatically completes the progress.
   * Defaults to `true`. Use `false` when work discovers and increases its total while running.
   */
  autoComplete?: boolean;
  /** Document used to construct DOM nodes. Defaults to the current global document. */
  document?: Document;
  /** Overrides the numeric text shown beside the title. */
  formatNumeric?: (snapshot: Readonly<ProgressSnapshot>) => string;
  /** Called once when the indicator enters the completed state. */
  onComplete?: (snapshot: Readonly<ProgressSnapshot>) => void;
  /** Called once when the indicator enters the cancelled state. */
  onCancel?: (snapshot: Readonly<ProgressSnapshot>) => void;
  /** Called after each accepted update and immediately before a terminal callback. */
  onProgress?: (snapshot: Readonly<ProgressSnapshot>) => void;
}

/** Fields that can be changed together in a single progress notification. */
export interface ProgressUpdate {
  /** Replacement current value. Must be finite and non-negative. */
  value?: number;
  /** Replacement target. Zero switches the bar to indeterminate mode. */
  total?: number;
  /** Replacement heading text. */
  title?: string;
  /** Replacement supplementary text. */
  note?: string;
  /** Whether the root element should be hidden. */
  collapsed?: boolean;
}

function requireDocument(provided?: Document): Document {
  if (provided !== undefined) return provided;
  if (typeof document !== "undefined") return document;
  throw new Error("ProgressFragment requires a Document");
}

function finiteNonNegative(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite, non-negative number`);
  }
  return value;
}

/**
 * Mutable progress state backed by an embeddable DOM fragment.
 *
 * @remarks
 * Appending {@link fragment} moves its children out of the `DocumentFragment`, as usual for DOM fragments.
 * The stable {@link element} reference remains available for later inspection or composition.
 * Completed and cancelled instances are terminal: subsequent updates are ignored.
 */
export class ProgressFragment {
  /** Fragment containing {@link element} until it is appended elsewhere. */
  readonly fragment: DocumentFragment;
  /** Stable root element updated for the lifetime of this instance. */
  readonly element: HTMLDivElement;

  private readonly progressEl: HTMLProgressElement;
  private readonly titleEl: HTMLSpanElement;
  private readonly numericEl: HTMLSpanElement;
  private readonly noteEl: HTMLSpanElement;
  private readonly autoComplete: boolean;
  private readonly formatNumeric?: (snapshot: Readonly<ProgressSnapshot>) => string;
  private readonly onComplete?: (snapshot: Readonly<ProgressSnapshot>) => void;
  private readonly onCancel?: (snapshot: Readonly<ProgressSnapshot>) => void;
  private readonly onProgress?: (snapshot: Readonly<ProgressSnapshot>) => void;

  private currentValue: number;
  private currentTotal: number;
  private currentTitle: string;
  private currentNote: string;
  private currentState: ProgressState = "running";
  private isCollapsed: boolean;

  /** Creates a progress fragment and renders its initial state. */
  constructor(options: ProgressFragmentOptions = {}) {
    const ownerDocument = requireDocument(options.document);
    this.currentValue = finiteNonNegative(options.value ?? 0, "value");
    this.currentTotal = finiteNonNegative(options.total ?? 0, "total");
    this.currentTitle = options.title ?? "";
    this.currentNote = options.note ?? "";
    this.isCollapsed = options.collapsed ?? false;
    this.autoComplete = options.autoComplete ?? true;
    this.formatNumeric = options.formatNumeric;
    this.onComplete = options.onComplete;
    this.onCancel = options.onCancel;
    this.onProgress = options.onProgress;

    this.fragment = ownerDocument.createDocumentFragment();
    this.element = ownerDocument.createElement("div");
    this.element.className = "vpk-progress";
    Object.assign(this.element.style, {
      display: "grid",
      gap: "0.25rem",
      width: "100%",
      minWidth: "12rem",
      maxWidth: "min(42rem, calc(100vw - 4rem))",
      overflow: "hidden",
    });

    const titleLine = ownerDocument.createElement("div");
    titleLine.className = "vpk-progress__title-line";
    Object.assign(titleLine.style, {
      display: "flex",
      gap: "0.5em",
      alignItems: "baseline",
      minWidth: "0",
    });

    this.titleEl = ownerDocument.createElement("span");
    this.titleEl.className = "vpk-progress__title";
    Object.assign(this.titleEl.style, {
      flex: "1 1 auto",
      minWidth: "0",
      overflowWrap: "anywhere",
    });

    this.numericEl = ownerDocument.createElement("span");
    this.numericEl.className = "vpk-progress__numeric";
    Object.assign(this.numericEl.style, {
      flex: "0 0 auto",
      marginLeft: "auto",
      fontVariantNumeric: "tabular-nums",
      color: "var(--text-muted)",
    });

    titleLine.append(this.titleEl, this.numericEl);

    this.progressEl = ownerDocument.createElement("progress");
    this.progressEl.className = "vpk-progress__bar";
    this.progressEl.style.width = "100%";

    this.noteEl = ownerDocument.createElement("span");
    this.noteEl.className = "vpk-progress__note";
    Object.assign(this.noteEl.style, {
      minHeight: "1.2em",
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
    });

    this.element.append(titleLine, this.progressEl, this.noteEl);
    this.fragment.append(this.element);
    this.render();
    this.maybeComplete();
  }

  /** Current progress value. Setting it is equivalent to `update({ value })`. */
  get value(): number {
    return this.currentValue;
  }

  set value(value: number) {
    this.update({ value });
  }

  /** Current target value. Zero represents indeterminate progress. */
  get total(): number {
    return this.currentTotal;
  }

  set total(total: number) {
    this.update({ total });
  }

  /** Heading displayed above the progress bar. */
  get title(): string {
    return this.currentTitle;
  }

  set title(title: string) {
    this.update({ title });
  }

  /** Supplementary text displayed below the progress bar. */
  get note(): string {
    return this.currentNote;
  }

  set note(note: string) {
    this.update({ note });
  }

  /** Whether the root element is hidden without discarding progress state. */
  get collapsed(): boolean {
    return this.isCollapsed;
  }

  set collapsed(collapsed: boolean) {
    this.update({ collapsed });
  }

  /** Current running, completed, or cancelled state. */
  get state(): ProgressState {
    return this.currentState;
  }

  /** Whether the current value is greater than zero. */
  get isStarted(): boolean {
    return this.currentValue > 0;
  }

  /** Whether the indicator has entered its terminal completed state. */
  get isCompleted(): boolean {
    return this.currentState === "completed";
  }

  /** Whether the indicator has entered its terminal cancelled state. */
  get isCancelled(): boolean {
    return this.currentState === "cancelled";
  }

  /** Returns a new frozen snapshot of the current public state. */
  get snapshot(): Readonly<ProgressSnapshot> {
    return Object.freeze({
      value: this.currentValue,
      total: this.currentTotal,
      title: this.currentTitle,
      note: this.currentNote,
      state: this.currentState,
    });
  }

  /**
   * Applies several fields, renders once, and emits at most one progress notification.
   *
   * @remarks Updates are ignored after completion or cancellation.
   */
  update(update: ProgressUpdate): void {
    if (this.currentState !== "running") return;
    if (update.value !== undefined) this.currentValue = finiteNonNegative(update.value, "value");
    if (update.total !== undefined) this.currentTotal = finiteNonNegative(update.total, "total");
    if (update.title !== undefined) this.currentTitle = update.title;
    if (update.note !== undefined) this.currentNote = update.note;
    if (update.collapsed !== undefined) this.isCollapsed = update.collapsed;
    this.render();
    if (!this.maybeComplete()) this.onProgress?.(this.snapshot);
  }

  /** Adds a finite, non-negative amount to the current value. Defaults to `1`. */
  increment(amount = 1): void {
    this.update({ value: this.currentValue + finiteNonNegative(amount, "amount") });
  }

  /**
   * Enters the terminal completed state and optionally replaces the note.
   *
   * @remarks The value is raised to at least the total. An indeterminate total becomes at least `1`.
   */
  complete(note?: string): void {
    if (this.currentState !== "running") return;
    if (note !== undefined) this.currentNote = note;
    if (this.currentTotal <= 0) this.currentTotal = Math.max(this.currentValue, 1);
    this.currentValue = Math.max(this.currentValue, this.currentTotal);
    this.currentState = "completed";
    this.render();
    const snapshot = this.snapshot;
    this.onProgress?.(snapshot);
    this.onComplete?.(snapshot);
  }

  /** Enters the terminal cancelled state and optionally replaces the note. */
  cancel(note?: string): void {
    if (this.currentState !== "running") return;
    if (note !== undefined) this.currentNote = note;
    this.currentState = "cancelled";
    this.render();
    const snapshot = this.snapshot;
    this.onProgress?.(snapshot);
    this.onCancel?.(snapshot);
  }

  private maybeComplete(): boolean {
    if (!this.autoComplete || this.currentState !== "running") return false;
    if (this.currentTotal <= 0 || this.currentValue < this.currentTotal) return false;
    // complete() emits both the final progress event and the completion event;
    // returning true prevents update() from emitting the same progress snapshot twice.
    this.complete();
    return true;
  }

  private render(): void {
    const snapshot = this.snapshot;
    this.titleEl.textContent = snapshot.title;
    this.noteEl.textContent = snapshot.note;
    this.element.style.display = this.isCollapsed ? "none" : "grid";

    if (snapshot.total > 0) {
      this.progressEl.max = snapshot.total;
      this.progressEl.value = Math.min(snapshot.value, snapshot.total);
    } else {
      this.progressEl.removeAttribute("value");
    }

    if (this.formatNumeric !== undefined) {
      this.numericEl.textContent = this.formatNumeric(snapshot);
    } else if (snapshot.state === "cancelled") {
      this.numericEl.textContent = "— / —";
    } else if (snapshot.total > 0) {
      this.numericEl.textContent = `${snapshot.value} / ${snapshot.total}`;
    } else {
      this.numericEl.textContent = "";
    }
  }
}

/** Configures a persistent Obsidian Notice containing a {@link ProgressFragment}. */
export interface ProgressNoticeOptions extends ProgressFragmentOptions {
  /** Milliseconds to wait before hiding after completion, or `false` to remain visible. Defaults to `1000`. */
  hideOnCompleteMs?: number | false;
  /** Milliseconds to wait before hiding after cancellation, or `false` to remain visible. Defaults to `1000`. */
  hideOnCancelMs?: number | false;
}

/**
 * Owns a progress fragment and the persistent Obsidian Notice that displays it.
 *
 * @remarks Call {@link hide} during plugin unload when a Notice may still be visible.
 */
export class ProgressNotice {
  /** Mutable progress state rendered inside the Notice. */
  readonly progress: ProgressFragment;
  /** Underlying Obsidian Notice, exposed for advanced integration. */
  readonly notice: Notice;
  private hideTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

  /** Creates and immediately displays a persistent progress Notice. */
  constructor(options: ProgressNoticeOptions = {}) {
    const {
      hideOnCompleteMs = 1_000,
      hideOnCancelMs = 1_000,
      onComplete,
      onCancel,
      ...progressOptions
    } = options;

    this.progress = new ProgressFragment({
      ...progressOptions,
      onComplete: (snapshot) => {
        onComplete?.(snapshot);
        this.scheduleHide(hideOnCompleteMs);
      },
      onCancel: (snapshot) => {
        onCancel?.(snapshot);
        this.scheduleHide(hideOnCancelMs);
      },
    });
    this.notice = new Notice(this.progress.fragment, 0);
    this.notice.messageEl.classList.add("vpk-progress-notice");
    Object.assign(this.notice.messageEl.style, {
      display: "flex",
      width: "100%",
      minWidth: "0",
    });
  }

  /** Delegates a batched update to {@link progress}. */
  update(update: ProgressUpdate): void {
    this.progress.update(update);
  }

  /** Delegates an increment to {@link progress}. */
  increment(amount = 1): void {
    this.progress.increment(amount);
  }

  /** Completes the progress and schedules the configured automatic hide. */
  complete(note?: string): void {
    this.progress.complete(note);
  }

  /** Cancels the progress and schedules the configured automatic hide. */
  cancel(note?: string): void {
    this.progress.cancel(note);
  }

  /** Cancels a pending automatic hide and immediately hides the Notice. */
  hide(): void {
    this.clearHideTimer();
    this.notice.hide();
  }

  private scheduleHide(delay: number | false): void {
    if (delay === false) return;
    this.clearHideTimer();
    this.hideTimer = globalThis.setTimeout(() => {
      this.hideTimer = undefined;
      this.notice.hide();
    }, finiteNonNegative(delay, "hide delay"));
  }

  private clearHideTimer(): void {
    if (this.hideTimer === undefined) return;
    globalThis.clearTimeout(this.hideTimer);
    this.hideTimer = undefined;
  }
}

/**
 * Creates and displays a persistent Obsidian progress Notice.
 *
 * @returns A controller for updating, completing, cancelling, or hiding the Notice.
 */
export function showProgressNotice(options: ProgressNoticeOptions = {}): ProgressNotice {
  return new ProgressNotice(options);
}
