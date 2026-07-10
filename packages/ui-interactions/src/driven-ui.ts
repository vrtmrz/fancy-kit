import type {
  ConfirmActionOptions,
  PickOneOptions,
  PromptTextOptions,
  ShowMessageOptions,
  UiInteractionDriver,
  UiInteractionRequest,
  UiInteractionResponse,
  UiInteractions,
} from "./contracts.js";

/** Configures a driver-aware implementation of {@link UiInteractions}. */
export interface DrivenUiInteractionsOptions {
  /** Optional instance-scoped driver consulted before invoking the fallback. */
  driver?: UiInteractionDriver;
  /** Optional platform UI invoked for requests that the driver does not handle. */
  fallback?: UiInteractions;
}

function invalidResponse(request: UiInteractionRequest, detail: string): never {
  const id = request.interactionId === undefined ? "" : ` (${request.interactionId})`;
  throw new TypeError(`Invalid automated response for ${request.kind}${id}: ${detail}`);
}

function unavailable(request: UiInteractionRequest): never {
  const id = request.interactionId === undefined ? "" : ` (${request.interactionId})`;
  throw new Error(`No UI fallback is available for ${request.kind}${id}`);
}

/**
 * Implements the neutral UI contract using an optional driver and platform fallback.
 *
 * @remarks
 * Automated results are checked against the same cancellation and identity rules
 * as real UI. State belongs to this instance; drivers must not be stored globally.
 */
export class DrivenUiInteractions implements UiInteractions {
  /** Optional instance-scoped driver consulted before the fallback. */
  readonly driver?: UiInteractionDriver;
  /** Optional platform implementation used for passed-through requests. */
  readonly fallback?: UiInteractions;

  /** Creates a driver-aware interaction capability. */
  constructor(options: DrivenUiInteractionsOptions = {}) {
    this.driver = options.driver;
    this.fallback = options.fallback;
  }

  /** Requests a single-line string and validates automated cancellation semantics. */
  async promptText(options: PromptTextOptions, interactionId?: string): Promise<string | null> {
    const request = { kind: "promptText", interactionId, options } as const;
    const automated = await this.handle(request);
    if (!automated.handled) {
      if (this.fallback === undefined) unavailable(request);
      return this.fallback.promptText(options, interactionId);
    }
    if (automated.value !== null && typeof automated.value !== "string") {
      invalidResponse(request, "expected a string or null");
    }
    return automated.value;
  }

  /** Requests a masked string and validates automated cancellation semantics. */
  async promptPassword(options: PromptTextOptions, interactionId?: string): Promise<string | null> {
    const request = { kind: "promptPassword", interactionId, options } as const;
    const automated = await this.handle(request);
    if (!automated.handled) {
      if (this.fallback === undefined) unavailable(request);
      return this.fallback.promptPassword(options, interactionId);
    }
    if (automated.value !== null && typeof automated.value !== "string") {
      invalidResponse(request, "expected a string or null");
    }
    return automated.value;
  }

  /** Requests one supplied item and validates identity for automated responses. */
  async pickOne<T>(options: PickOneOptions<T>, interactionId?: string): Promise<T | null> {
    const request = {
      kind: "pickOne",
      interactionId,
      options: options as PickOneOptions<unknown>,
    } as const;
    const automated = await this.handle(request);
    if (!automated.handled) {
      if (this.fallback === undefined) unavailable(request);
      return this.fallback.pickOne(options, interactionId);
    }
    if (automated.value !== null && !options.items.includes(automated.value as T)) {
      invalidResponse(request, "expected null or one of the supplied items");
    }
    return automated.value as T | null;
  }

  /** Requests one supplied literal action and validates automated responses. */
  async confirmAction<const T extends string>(
    options: ConfirmActionOptions<T>,
    interactionId?: string,
  ): Promise<T | null> {
    const request = {
      kind: "confirmAction",
      interactionId,
      options: options as ConfirmActionOptions<string>,
    } as const;
    const automated = await this.handle(request);
    if (!automated.handled) {
      if (this.fallback === undefined) unavailable(request);
      return this.fallback.confirmAction(options, interactionId);
    }
    if (automated.value !== null && !options.actions.includes(automated.value as T)) {
      invalidResponse(request, "expected null or one of the supplied actions");
    }
    return automated.value as T | null;
  }

  /** Shows or automatically acknowledges an informational Markdown message. */
  async showMessage(options: ShowMessageOptions, interactionId?: string): Promise<void> {
    const request = { kind: "showMessage", interactionId, options } as const;
    const automated = await this.handle(request);
    if (!automated.handled) {
      if (this.fallback === undefined) unavailable(request);
      await this.fallback.showMessage(options, interactionId);
      return;
    }
    if (automated.value !== undefined) invalidResponse(request, "expected no response value");
  }

  private async handle(request: UiInteractionRequest): Promise<UiInteractionResponse> {
    if (this.driver === undefined) return { handled: false };
    return this.driver.handle(request);
  }
}

/** Creates a driver-aware implementation of the neutral UI contract. */
export function createDrivenUiInteractions(
  options: DrivenUiInteractionsOptions = {},
): DrivenUiInteractions {
  return new DrivenUiInteractions(options);
}
