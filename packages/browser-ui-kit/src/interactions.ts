import {
  DrivenUiInteractions,
  type ConfirmActionOptions,
  type PickOneOptions,
  type PromptTextOptions,
  type ShowMessageOptions,
  type UiInteractionDriver,
  type UiInteractions,
} from "@vrtmrz/ui-interactions";

/** Request passed to a browser presenter for one text or password prompt. */
export type BrowserPromptRequest = PromptTextOptions & {
  /** Native input mode selected by the neutral interaction method. */
  inputType: "text" | "password";
  /** Optional stable application identifier. */
  interactionId?: string;
};

/** One presenter-level choice whose identifier is independent of its visible label. */
export interface BrowserChoice {
  /** Opaque identifier returned when this choice is selected. */
  id: string;
  /** Primary visible text. */
  label: string;
  /** Optional secondary visible text. */
  description?: string;
}

/** Request passed to a browser presenter for one choice dialogue. */
export interface BrowserChoiceRequest {
  /** Visible dialogue title. */
  title: string;
  /** Markdown body supplied by the application. */
  message: string;
  /** Choices presented to the user. */
  choices: readonly BrowserChoice[];
  /** Choice selected when {@link timeoutMs} expires. */
  defaultChoiceId?: string;
  /** Optional automatic-selection delay. */
  timeoutMs?: number;
  /** Requested action layout. */
  actionLayout?: "auto" | "vertical";
  /** Logical source path forwarded to the Markdown renderer. */
  sourcePath?: string;
  /** Optional stable application identifier. */
  interactionId?: string;
}

/**
 * Browser-owned rendering boundary used by {@link BrowserUiInteractions}.
 *
 * A consumer can supply a framework presenter while preserving the same
 * interaction mapping and cancellation semantics.
 */
export interface BrowserInteractionPresenter {
  /** Presents one text or password request. */
  prompt(request: BrowserPromptRequest): Promise<string | null>;
  /** Presents one typed choice request and returns its opaque identifier. */
  choose(request: BrowserChoiceRequest): Promise<string | null>;
}

/** Input supplied to a browser Markdown renderer. */
export interface BrowserMarkdownRenderRequest {
  /** Empty element which should receive the rendered content. */
  container: HTMLElement;
  /** Application-supplied Markdown. */
  markdown: string;
  /** Optional logical path used to resolve relative links. */
  sourcePath?: string;
}

/**
 * Renders Markdown into a dialogue element.
 *
 * @returns An optional cleanup callback, invoked when the dialogue closes.
 */
export type BrowserMarkdownRenderer = (
  request: BrowserMarkdownRenderRequest,
) => void | (() => void);

/** Configures the framework-free DOM presenter. */
export interface DomBrowserInteractionPresenterOptions {
  /** Document which owns all created dialogue elements. Defaults to the active document. */
  document?: Document;
  /** Element which receives dialogue elements. Defaults to `document.body`. */
  container?: HTMLElement;
  /**
   * Optional application-owned Markdown renderer.
   *
   * Omit it to display Markdown source as plain text. The kit does not insert
   * application-supplied HTML by itself.
   */
  renderMarkdown?: BrowserMarkdownRenderer;
  /** Aborting the signal dismisses any dialogue created by this presenter. */
  signal?: AbortSignal;
}

function activeDocument(): Document {
  if (typeof globalThis.document === "undefined") {
    throw new Error("A browser Document is required to present UI");
  }
  return globalThis.document;
}

function applyDialogueStyles(dialogue: HTMLDialogElement): void {
  Object.assign(dialogue.style, {
    background: "Canvas",
    border: "1px solid color-mix(in srgb, CanvasText 25%, transparent)",
    borderRadius: "0.5rem",
    color: "CanvasText",
    margin: "auto",
    maxHeight: "min(80vh, 48rem)",
    maxWidth: "min(90vw, 48rem)",
    minWidth: "min(32rem, 80vw)",
    overflow: "auto",
    padding: "1rem",
  });
}

function applyActionStyles(container: HTMLElement, vertical: boolean): void {
  Object.assign(container.style, {
    display: "flex",
    flexDirection: vertical ? "column" : "row",
    flexWrap: "wrap",
    gap: "0.5rem",
    justifyContent: "flex-end",
    marginTop: "1rem",
  });
}

function openDialogue(dialogue: HTMLDialogElement): void {
  const showModal = dialogue.showModal;
  if (typeof showModal === "function") {
    showModal.call(dialogue);
  } else {
    dialogue.setAttribute("open", "");
  }
}

function closeDialogue(dialogue: HTMLDialogElement): void {
  if (dialogue.open && typeof dialogue.close === "function") {
    dialogue.close();
  }
  dialogue.remove();
}

function appendTitle(
  document: Document,
  dialogue: HTMLDialogElement,
  title: string,
): void {
  const heading = document.createElement("h2");
  heading.className = "vpk-browser-dialog__title";
  heading.textContent = title;
  heading.style.marginTop = "0";
  dialogue.append(heading);
  dialogue.setAttribute(
    "aria-labelledby",
    heading.id ||= `vpk-browser-dialog-title-${nextDialogueId()}`,
  );
}

let dialogueSequence = 0;

function nextDialogueId(): number {
  dialogueSequence += 1;
  return dialogueSequence;
}

/**
 * Framework-free browser presenter backed by native dialogue and form elements.
 *
 * Markdown rendering is explicitly injected. Without a renderer, application
 * text is assigned through `textContent`, so the default path cannot execute
 * supplied HTML.
 */
export class DomBrowserInteractionPresenter
  implements BrowserInteractionPresenter
{
  private readonly documentOption?: Document;
  private readonly containerOption?: HTMLElement;
  private readonly renderMarkdown?: BrowserMarkdownRenderer;
  private readonly signal?: AbortSignal;

  /** Creates a native DOM presenter. */
  constructor(options: DomBrowserInteractionPresenterOptions = {}) {
    this.documentOption = options.document;
    this.containerOption = options.container;
    this.renderMarkdown = options.renderMarkdown;
    this.signal = options.signal;
  }

  /** Presents a single-line text or password prompt. */
  prompt(request: BrowserPromptRequest): Promise<string | null> {
    if (this.signal?.aborted) return Promise.resolve(null);

    const dialogue = this.createDialogue(request.title);
    const form = this.document.createElement("form");
    form.className = "vpk-browser-dialog__form";
    form.noValidate = true;

    const label = this.document.createElement("label");
    label.className = "vpk-browser-dialog__label";
    label.textContent = request.label ?? request.title;
    label.style.display = "grid";
    label.style.gap = "0.5rem";

    const input = this.document.createElement("input");
    input.className = "vpk-browser-dialog__input";
    input.type = request.inputType;
    input.value = request.initialValue ?? "";
    input.placeholder = request.placeholder ?? "";
    input.autocomplete = request.inputType === "password" ? "current-password" : "off";
    label.append(input);
    form.append(label);

    if (request.description !== undefined && request.description !== "") {
      const description = this.document.createElement("p");
      description.className = "vpk-browser-dialog__description";
      description.textContent = request.description;
      form.append(description);
    }

    const actions = this.document.createElement("div");
    actions.className = "vpk-browser-dialog__actions";
    applyActionStyles(actions, false);

    const submit = this.document.createElement("button");
    submit.type = "submit";
    submit.dataset.dialogAction = "submit";
    submit.textContent = request.submitLabel ?? "OK";

    const cancel = this.document.createElement("button");
    cancel.type = "button";
    cancel.dataset.dialogAction = "cancel";
    cancel.textContent = request.cancelLabel ?? "Cancel";

    actions.append(submit, cancel);
    form.append(actions);
    dialogue.append(form);

    return new Promise((resolve) => {
      let settled = false;
      const settle = (value: string | null): void => {
        if (settled) return;
        settled = true;
        this.signal?.removeEventListener("abort", dismiss);
        closeDialogue(dialogue);
        resolve(value);
      };
      const dismiss = (): void => settle(null);

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        settle(input.value);
      });
      cancel.addEventListener("click", dismiss);
      dialogue.addEventListener("cancel", (event) => {
        event.preventDefault();
        dismiss();
      });
      dialogue.addEventListener("click", (event) => {
        if (event.target === dialogue) dismiss();
      });
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" || event.isComposing) return;
        event.preventDefault();
        settle(input.value);
      });
      this.signal?.addEventListener("abort", dismiss, { once: true });

      openDialogue(dialogue);
      input.focus();
      if (request.selectInitialValue && input.value !== "") input.select();
    });
  }

  /** Presents one or more choices and returns the selected opaque identifier. */
  choose(request: BrowserChoiceRequest): Promise<string | null> {
    if (this.signal?.aborted) return Promise.resolve(null);
    if (
      request.timeoutMs !== undefined &&
      (!Number.isFinite(request.timeoutMs) || request.timeoutMs < 0)
    ) {
      return Promise.reject(
        new RangeError("timeoutMs must be a finite non-negative number"),
      );
    }

    const dialogue = this.createDialogue(request.title);
    let disposeMarkdown: (() => void) | undefined;
    if (request.message !== "") {
      const message = this.document.createElement("div");
      message.className = "vpk-browser-dialog__message";
      if (this.renderMarkdown === undefined) {
        message.textContent = request.message;
      } else {
        disposeMarkdown =
          this.renderMarkdown({
            container: message,
            markdown: request.message,
            sourcePath: request.sourcePath,
          }) ?? undefined;
      }
      dialogue.append(message);
    }

    const actions = this.document.createElement("div");
    actions.className = "vpk-browser-dialog__actions";
    applyActionStyles(actions, request.actionLayout === "vertical");

    const choiceButtons = new Map<string, HTMLButtonElement>();
    for (const choice of request.choices) {
      const button = this.document.createElement("button");
      button.type = "button";
      button.dataset.choiceId = choice.id;
      button.textContent = choice.label;
      if (choice.description !== undefined && choice.description !== "") {
        const description = this.document.createElement("small");
        description.textContent = choice.description;
        description.style.display = "block";
        button.append(description);
      }
      if (choice.id === request.defaultChoiceId) {
        button.dataset.defaultChoice = "true";
      }
      choiceButtons.set(choice.id, button);
      actions.append(button);
    }
    dialogue.append(actions);

    return new Promise((resolve) => {
      let settled = false;
      let timeout: ReturnType<typeof globalThis.setTimeout> | undefined;
      const settle = (value: string | null): void => {
        if (settled) return;
        settled = true;
        if (timeout !== undefined) globalThis.clearTimeout(timeout);
        this.signal?.removeEventListener("abort", dismiss);
        disposeMarkdown?.();
        closeDialogue(dialogue);
        resolve(value);
      };
      const dismiss = (): void => settle(null);

      for (const [choiceId, button] of choiceButtons) {
        button.addEventListener("click", () => settle(choiceId));
      }
      dialogue.addEventListener("cancel", (event) => {
        event.preventDefault();
        dismiss();
      });
      dialogue.addEventListener("click", (event) => {
        if (event.target === dialogue) dismiss();
      });
      this.signal?.addEventListener("abort", dismiss, { once: true });

      openDialogue(dialogue);
      (
        choiceButtons.get(request.defaultChoiceId ?? "") ??
        choiceButtons.values().next().value
      )?.focus();

      if (
        request.timeoutMs !== undefined &&
        request.defaultChoiceId !== undefined
      ) {
        timeout = globalThis.setTimeout(
          () => settle(request.defaultChoiceId ?? null),
          request.timeoutMs,
        );
      }
    });
  }

  private createDialogue(title: string): HTMLDialogElement {
    const dialogue = this.document.createElement("dialog");
    dialogue.className = "vpk-browser-dialog";
    dialogue.setAttribute("aria-modal", "true");
    dialogue.setAttribute("role", "dialog");
    applyDialogueStyles(dialogue);
    appendTitle(this.document, dialogue, title);
    this.container.append(dialogue);
    return dialogue;
  }

  private get document(): Document {
    return this.documentOption ?? activeDocument();
  }

  private get container(): HTMLElement {
    return this.containerOption ?? this.document.body;
  }
}

function parseIndexedChoice(
  id: string,
  expectedKind: string,
): number | undefined {
  const [kind, rawIndex, ...remaining] = id.split(":");
  if (kind !== expectedKind || remaining.length > 0 || rawIndex === "") {
    return undefined;
  }
  const index = Number(rawIndex);
  return Number.isSafeInteger(index) && index >= 0 ? index : undefined;
}

/**
 * Maps the neutral UI contract to a browser-owned presenter.
 *
 * Object identity and typed action identifiers remain outside the presenter,
 * whose result is an opaque string.
 */
export class BrowserUiInteractions implements UiInteractions {
  /** Creates an adapter around one browser presenter. */
  constructor(private readonly presenter: BrowserInteractionPresenter) {}

  /** Requests a normal text input. */
  promptText(
    options: PromptTextOptions,
    interactionId?: string,
  ): Promise<string | null> {
    return this.presenter.prompt({
      ...options,
      inputType: "text",
      interactionId,
    });
  }

  /** Requests a visually masked text input. */
  promptPassword(
    options: PromptTextOptions,
    interactionId?: string,
  ): Promise<string | null> {
    return this.presenter.prompt({
      ...options,
      inputType: "password",
      interactionId,
    });
  }

  /** Requests one item while preserving its original object identity. */
  async pickOne<T>(
    options: PickOneOptions<T>,
    interactionId?: string,
  ): Promise<T | null> {
    const selectedId = await this.presenter.choose({
      title: options.placeholder ?? "Select an item",
      message: "",
      choices: options.items.map((item, index) => ({
        id: `item:${index}`,
        label: options.getText(item),
        description: options.getDescription?.(item),
      })),
      interactionId,
    });
    if (selectedId === null) return null;
    const selectedIndex = parseIndexedChoice(selectedId, "item");
    return selectedIndex === undefined
      ? null
      : (options.items[selectedIndex] ?? null);
  }

  /** Requests one typed action independently of its visible label. */
  async confirmAction<const T extends string>(
    options: ConfirmActionOptions<T>,
    interactionId?: string,
  ): Promise<T | null> {
    const defaultIndex =
      options.defaultAction === undefined
        ? -1
        : options.actions.indexOf(options.defaultAction);
    const selectedId = await this.presenter.choose({
      title: options.title,
      message: options.message,
      choices: options.actions.map((action, index) => ({
        id: `action:${index}`,
        label: options.labels?.[action] ?? action,
      })),
      defaultChoiceId:
        defaultIndex < 0 ? undefined : `action:${defaultIndex}`,
      timeoutMs: options.timeoutMs,
      actionLayout: options.actionLayout,
      sourcePath: options.sourcePath,
      interactionId,
    });
    if (selectedId === null) return null;
    const selectedIndex = parseIndexedChoice(selectedId, "action");
    return selectedIndex === undefined
      ? null
      : (options.actions[selectedIndex] ?? null);
  }

  /** Shows a message until its sole close choice is acknowledged or dismissed. */
  async showMessage(
    options: ShowMessageOptions,
    interactionId?: string,
  ): Promise<void> {
    await this.presenter.choose({
      title: options.title,
      message: options.message,
      choices: [
        { id: "message:close", label: options.closeLabel ?? "Close" },
      ],
      defaultChoiceId: "message:close",
      sourcePath: options.sourcePath,
      interactionId,
    });
  }
}

/** Configures a driver-aware browser UI context. */
export interface BrowserUiOptions
  extends DomBrowserInteractionPresenterOptions {
  /** Optional presenter override, for framework integration or focused tests. */
  presenter?: BrowserInteractionPresenter;
  /** Optional instance-scoped driver consulted before native browser UI. */
  driver?: UiInteractionDriver;
}

/** Driver-aware browser implementation of the neutral interaction contract. */
export class BrowserUiContext extends DrivenUiInteractions {
  /** Presenter invoked when the driver passes an interaction through. */
  readonly presenter: BrowserInteractionPresenter;

  /** Creates a browser UI context. */
  constructor(options: BrowserUiOptions = {}) {
    const presenter =
      options.presenter ?? new DomBrowserInteractionPresenter(options);
    super({
      driver: options.driver,
      fallback: new BrowserUiInteractions(presenter),
    });
    this.presenter = presenter;
  }
}

/** Creates a driver-aware browser implementation of {@link UiInteractions}. */
export function createBrowserUi(
  options: BrowserUiOptions = {},
): UiInteractions {
  return new BrowserUiContext(options);
}
