/** Configures a single-line text or password prompt. */
export interface PromptTextOptions {
  /** Text displayed in the prompt title. */
  title: string;
  /** Optional label displayed beside the input. */
  label?: string;
  /** Optional explanatory text displayed below the label. */
  description?: string;
  /** Placeholder shown when the input is empty. Defaults to an empty string. */
  placeholder?: string;
  /** Value placed in the input when the prompt opens. Defaults to an empty string. */
  initialValue?: string;
  /** Label for the primary submit action. Defaults to `"OK"`. */
  submitLabel?: string;
  /** Label for the dismissal action. Defaults to `"Cancel"`. */
  cancelLabel?: string;
  /** Whether to select a non-empty initial value after focusing the input. Defaults to `false`. */
  selectInitialValue?: boolean;
}

/** Configures a selector that returns the original selected item. */
export interface PickOneOptions<T> {
  /** Candidate items. The selector preserves their object identity. */
  items: readonly T[];
  /** Returns searchable and visible text for an item. */
  getText: (item: T) => string;
  /** Returns optional secondary visible text for an item. It does not affect search matching. */
  getDescription?: (item: T) => string | undefined;
  /** Text shown in the search input. Defaults to `"Select an item"`. */
  placeholder?: string;
}

/** Configures a Markdown message with one or more typed action buttons. */
export interface ConfirmActionOptions<T extends string> {
  /** Text displayed in the dialog title. */
  title: string;
  /** Markdown rendered as the dialog body. */
  message: string;
  /** Action identifiers returned when their corresponding controls are selected. */
  actions: readonly T[];
  /** Optional visible labels keyed by action identifier. Unmapped actions display their identifier. */
  labels?: Partial<Record<T, string>>;
  /** Action presented as primary and selected when {@link timeoutMs} expires. */
  defaultAction?: T;
  /** Delay before selecting {@link defaultAction}; ignored when no default action is supplied. */
  timeoutMs?: number;
  /** Logical source path used to resolve relative links in Markdown. Defaults to an empty string. */
  sourcePath?: string;
}

/** Configures a one-action informational Markdown dialog. */
export interface ShowMessageOptions {
  /** Text displayed in the dialog title. */
  title: string;
  /** Markdown rendered as the dialog body. */
  message: string;
  /** Label for the close action. Defaults to `"Close"`. */
  closeLabel?: string;
  /** Logical source path used to resolve relative links in Markdown. Defaults to an empty string. */
  sourcePath?: string;
}

/** Platform-neutral capability for application-level UI interactions. */
export interface UiInteractions {
  /** Requests a single-line string, or resolves to `null` when dismissed. */
  promptText(options: PromptTextOptions, interactionId?: string): Promise<string | null>;
  /** Requests a visually masked single-line string, or resolves to `null` when dismissed. */
  promptPassword(options: PromptTextOptions, interactionId?: string): Promise<string | null>;
  /** Requests one supplied item by identity, or resolves to `null` when dismissed. */
  pickOne<T>(options: PickOneOptions<T>, interactionId?: string): Promise<T | null>;
  /** Requests one supplied literal action, or resolves to `null` when dismissed. */
  confirmAction<const T extends string>(
    options: ConfirmActionOptions<T>,
    interactionId?: string,
  ): Promise<T | null>;
  /** Shows an informational Markdown message and resolves after acknowledgement. */
  showMessage(options: ShowMessageOptions, interactionId?: string): Promise<void>;
}

/** Names of interactions that a {@link UiInteractionDriver} can observe or handle. */
export type UiInteractionKind =
  | "promptText"
  | "promptPassword"
  | "pickOne"
  | "confirmAction"
  | "showMessage";

interface UiInteractionBase {
  kind: UiInteractionKind;
  interactionId?: string;
}

/** Read-only description of one requested interaction. */
export type UiInteractionRequest =
  | (UiInteractionBase & { kind: "promptText" | "promptPassword"; options: Readonly<PromptTextOptions> })
  | (UiInteractionBase & { kind: "pickOne"; options: Readonly<PickOneOptions<unknown>> })
  | (UiInteractionBase & { kind: "confirmAction"; options: Readonly<ConfirmActionOptions<string>> })
  | (UiInteractionBase & { kind: "showMessage"; options: Readonly<ShowMessageOptions> });

/** Tells the interaction dispatcher to invoke its platform fallback. */
export interface UiInteractionPassthrough {
  /** Discriminator indicating that the request was not handled. */
  handled: false;
}

/** Supplies an automated result without invoking platform UI. */
export interface HandledUiInteraction {
  /** Discriminator indicating that the request was handled. */
  handled: true;
  /** Result to validate against the interaction contract. Omit it for message acknowledgement. */
  value?: unknown;
}

/** Result returned by a {@link UiInteractionDriver}. */
export type UiInteractionResponse = UiInteractionPassthrough | HandledUiInteraction;

/** Instance-scoped adapter that can observe UI requests and optionally provide responses. */
export interface UiInteractionDriver {
  /** Handles or passes through one interaction request. */
  handle(request: UiInteractionRequest): UiInteractionResponse | Promise<UiInteractionResponse>;
}
