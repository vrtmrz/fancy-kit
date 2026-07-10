import {
  Component,
  FuzzySuggestModal,
  MarkdownRenderer,
  Modal,
  Setting,
  type App,
  type TextComponent,
} from "obsidian";
import type {
  ConfirmActionOptions,
  PickOneOptions,
  PromptTextOptions,
  ShowMessageOptions,
} from "@vrtmrz/ui-interactions";

export type {
  ConfirmActionOptions,
  PickOneOptions,
  PromptTextOptions,
  ShowMessageOptions,
} from "@vrtmrz/ui-interactions";

interface TextPromptModalOptions extends PromptTextOptions {
  password: boolean;
}

class TextPromptModal extends Modal {
  private readonly options: TextPromptModalOptions;
  private resolveResult: ((result: string | null) => void) | undefined;
  private value: string;
  private input: TextComponent | undefined;

  constructor(
    app: App,
    options: TextPromptModalOptions,
    resolveResult: (result: string | null) => void,
  ) {
    super(app);
    this.options = options;
    this.resolveResult = resolveResult;
    this.value = options.initialValue ?? "";
  }

  override onOpen(): void {
    this.setTitle(this.options.title);

    const inputSetting = new Setting(this.contentEl);
    if (this.options.label !== undefined) inputSetting.setName(this.options.label);
    if (this.options.description !== undefined) inputSetting.setDesc(this.options.description);

    inputSetting.addText((input) => {
      this.input = input;
      input.setValue(this.value);
      input.setPlaceholder(this.options.placeholder ?? "");
      input.inputEl.type = this.options.password ? "password" : "text";
      input.onChange((value) => {
        this.value = value;
      });
      input.inputEl.addEventListener("keydown", (event) => {
        // An Enter used to confirm an IME composition must not also submit the modal.
        if (event.key !== "Enter" || event.isComposing) return;
        event.preventDefault();
        this.submit();
      });
    });

    new Setting(this.contentEl)
      .addButton((button) =>
        button
          .setButtonText(this.options.submitLabel ?? "OK")
          .setCta()
          .onClick(() => this.submit()),
      )
      .addButton((button) =>
        button.setButtonText(this.options.cancelLabel ?? "Cancel").onClick(() => this.close()),
      );

    this.input?.inputEl.focus();
    if (this.options.selectInitialValue && this.value.length > 0) {
      this.input?.inputEl.select();
    }
  }

  override onClose(): void {
    this.settle(null);
    this.input = undefined;
    this.contentEl.empty();
  }

  private submit(): void {
    this.settle(this.value);
    this.close();
  }

  private settle(result: string | null): void {
    // Button submission and Obsidian's close lifecycle may both reach this method.
    // Clearing the resolver first guarantees that the public Promise settles once.
    const resolve = this.resolveResult;
    if (resolve === undefined) return;
    this.resolveResult = undefined;
    resolve(result);
  }
}

/**
 * Opens a single-line text prompt.
 *
 * @param app - Obsidian application that owns the modal.
 * @param options - Prompt labels and initial input state.
 * @returns The submitted string, including an explicitly submitted empty string, or `null` when dismissed.
 */
export function promptText(app: App, options: PromptTextOptions): Promise<string | null> {
  return new Promise((resolve) => {
    new TextPromptModal(app, { ...options, password: false }, resolve).open();
  });
}

/**
 * Opens a single-line prompt whose input uses the password field type.
 *
 * @param app - Obsidian application that owns the modal.
 * @param options - Prompt labels and initial input state.
 * @returns The submitted string, including an explicitly submitted empty string, or `null` when dismissed.
 *
 * @remarks
 * This controls visual masking only. It does not encrypt, persist, or otherwise protect the returned value.
 */
export function promptPassword(app: App, options: PromptTextOptions): Promise<string | null> {
  return new Promise((resolve) => {
    new TextPromptModal(app, { ...options, password: true }, resolve).open();
  });
}

class PickOneModal<T> extends FuzzySuggestModal<T> {
  private readonly items: readonly T[];
  private readonly itemText: (item: T) => string;
  private resolveResult: ((result: T | null) => void) | undefined;

  constructor(app: App, options: PickOneOptions<T>, resolveResult: (result: T | null) => void) {
    super(app);
    this.items = options.items;
    this.itemText = options.getText;
    this.resolveResult = resolveResult;
    this.setPlaceholder(options.placeholder ?? "Select an item");
  }

  getItems(): T[] {
    return [...this.items];
  }

  getItemText(item: T): string {
    return this.itemText(item);
  }

  onChooseItem(item: T, _event: MouseEvent | KeyboardEvent): void {
    this.settle(item);
  }

  override onClose(): void {
    // FuzzySuggestModal closes as part of its own selection lifecycle. Deferring
    // dismissal lets onChooseItem settle the selected value first.
    globalThis.setTimeout(() => this.settle(null), 0);
  }

  private settle(result: T | null): void {
    const resolve = this.resolveResult;
    if (resolve === undefined) return;
    this.resolveResult = undefined;
    resolve(result);
  }
}

/**
 * Opens an Obsidian fuzzy selector for arbitrary typed items.
 *
 * @param app - Obsidian application that owns the selector.
 * @param options - Candidate items and their searchable text projection.
 * @returns The original selected item instance, or `null` when dismissed.
 */
export function pickOne<T>(app: App, options: PickOneOptions<T>): Promise<T | null> {
  return new Promise((resolve) => {
    new PickOneModal(app, options, resolve).open();
  });
}

class ActionDialog<T extends string> extends Modal {
  private readonly options: ConfirmActionOptions<T>;
  private readonly renderer = new Component();
  private resolveResult: ((result: T | null) => void) | undefined;
  private timeout: ReturnType<typeof globalThis.setTimeout> | undefined;

  constructor(
    app: App,
    options: ConfirmActionOptions<T>,
    resolveResult: (result: T | null) => void,
  ) {
    super(app);
    this.options = options;
    this.resolveResult = resolveResult;
  }

  override onOpen(): void {
    this.setTitle(this.options.title);
    this.renderer.load();

    const messageEl = this.contentEl.createDiv();
    void MarkdownRenderer.render(
      this.app,
      this.options.message,
      messageEl,
      this.options.sourcePath ?? "",
      this.renderer,
    );

    const actions = new Setting(this.contentEl);
    for (const action of this.options.actions) {
      actions.addButton((button) => {
        button.setButtonText(this.options.labels?.[action] ?? action).onClick(() => this.choose(action));
        if (action === this.options.defaultAction) button.setCta();
      });
    }

    if (this.options.timeoutMs !== undefined && this.options.defaultAction !== undefined) {
      this.timeout = globalThis.setTimeout(
        () => this.choose(this.options.defaultAction as T),
        this.options.timeoutMs,
      );
    }
  }

  override onClose(): void {
    this.clearTimeout();
    this.renderer.unload();
    this.settle(null);
    this.contentEl.empty();
  }

  private choose(action: T): void {
    this.settle(action);
    this.close();
  }

  private settle(result: T | null): void {
    // A timeout, action button, and close event can race; only the first wins.
    const resolve = this.resolveResult;
    if (resolve === undefined) return;
    this.resolveResult = undefined;
    resolve(result);
  }

  private clearTimeout(): void {
    if (this.timeout === undefined) return;
    globalThis.clearTimeout(this.timeout);
    this.timeout = undefined;
  }
}

/**
 * Opens a Markdown confirmation modal whose result retains literal action types.
 *
 * @param app - Obsidian application that owns the modal.
 * @param options - Markdown content, actions, labels, and optional timeout.
 * @returns The selected action identifier, or `null` when dismissed.
 */
export function confirmAction<const T extends string>(
  app: App,
  options: ConfirmActionOptions<T>,
): Promise<T | null> {
  return new Promise((resolve) => {
    new ActionDialog(app, options, resolve).open();
  });
}

/**
 * Shows an informational Markdown modal and resolves after it closes.
 *
 * @param app - Obsidian application that owns the modal.
 * @param options - Message content and close-button label.
 */
export async function showMessage(app: App, options: ShowMessageOptions): Promise<void> {
  const close = "close" as const;
  await confirmAction(app, {
    title: options.title,
    message: options.message,
    actions: [close],
    labels: { [close]: options.closeLabel ?? "Close" },
    defaultAction: close,
    sourcePath: options.sourcePath,
  });
}
