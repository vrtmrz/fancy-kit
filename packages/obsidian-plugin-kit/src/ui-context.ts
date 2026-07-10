import type { App } from "obsidian";
import {
  confirmAction,
  pickOne,
  promptPassword,
  promptText,
  showMessage,
  type ConfirmActionOptions,
  type PickOneOptions,
  type PromptTextOptions,
  type ShowMessageOptions,
} from "./dialog.js";

/** Names of UI interactions that a {@link UiInteractionDriver} can observe or handle. */
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

/** Read-only description of an interaction presented to a {@link UiInteractionDriver}. */
export type UiInteractionRequest =
  | (UiInteractionBase & { kind: "promptText" | "promptPassword"; options: Readonly<PromptTextOptions> })
  | (UiInteractionBase & { kind: "pickOne"; options: Readonly<PickOneOptions<unknown>> })
  | (UiInteractionBase & { kind: "confirmAction"; options: Readonly<ConfirmActionOptions<string>> })
  | (UiInteractionBase & { kind: "showMessage"; options: Readonly<ShowMessageOptions> });

/**
 * Result returned by a {@link UiInteractionDriver}.
 *
 * `handled: false` opens the real Obsidian UI. A handled response is validated
 * against the values that the corresponding real interaction could return.
 */
export type UiInteractionResponse =
  | { handled: false }
  | { handled: true; value?: unknown };

/** Adapter that can observe UI requests and optionally provide responses without opening UI. */
export interface UiInteractionDriver {
  /** Handles or passes through one interaction request. */
  handle(request: UiInteractionRequest): UiInteractionResponse | Promise<UiInteractionResponse>;
}

/** Configures a {@link UiContext}. */
export interface UiContextOptions {
  /** Optional instance-scoped driver. Omit it to always use real Obsidian UI. */
  driver?: UiInteractionDriver;
}

function invalidResponse(request: UiInteractionRequest, detail: string): never {
  const id = request.interactionId === undefined ? "" : ` (${request.interactionId})`;
  throw new TypeError(`Invalid automated response for ${request.kind}${id}: ${detail}`);
}

/**
 * Groups dialog operations with an optional interaction driver.
 *
 * @remarks
 * Create one context per plugin instance, application context, or test. Do not
 * place a scripted driver in a class static or module global, because queued
 * responses would leak between parallel tests, vaults, and plugin instances.
 */
export class UiContext {
  /** Obsidian application used whenever an interaction passes through to real UI. */
  readonly app: App;
  /** Optional driver consulted before opening real UI. */
  readonly driver?: UiInteractionDriver;

  /** Creates a UI context for an Obsidian application. */
  constructor(app: App, options: UiContextOptions = {}) {
    this.app = app;
    this.driver = options.driver;
  }

  /**
   * Requests a single-line string from the driver or a real text prompt.
   *
   * @param interactionId - Optional stable identifier used by scripted drivers to verify the flow.
   */
  async promptText(options: PromptTextOptions, interactionId?: string): Promise<string | null> {
    const request = { kind: "promptText", interactionId, options } as const;
    const automated = await this.handle(request);
    if (!automated.handled) return promptText(this.app, options);
    if (automated.value !== null && typeof automated.value !== "string") {
      invalidResponse(request, "expected a string or null");
    }
    return automated.value;
  }

  /**
   * Requests a masked single-line string from the driver or a real password prompt.
   *
   * @param interactionId - Optional stable identifier used by scripted drivers to verify the flow.
   */
  async promptPassword(options: PromptTextOptions, interactionId?: string): Promise<string | null> {
    const request = { kind: "promptPassword", interactionId, options } as const;
    const automated = await this.handle(request);
    if (!automated.handled) return promptPassword(this.app, options);
    if (automated.value !== null && typeof automated.value !== "string") {
      invalidResponse(request, "expected a string or null");
    }
    return automated.value;
  }

  /**
   * Requests one of the supplied item instances from the driver or a real fuzzy selector.
   *
   * @remarks Automated non-null responses must be present in `options.items` by identity.
   */
  async pickOne<T>(options: PickOneOptions<T>, interactionId?: string): Promise<T | null> {
    const request = {
      kind: "pickOne",
      interactionId,
      options: options as PickOneOptions<unknown>,
    } as const;
    const automated = await this.handle(request);
    if (!automated.handled) return pickOne(this.app, options);
    if (automated.value !== null && !options.items.includes(automated.value as T)) {
      invalidResponse(request, "expected null or one of the supplied items");
    }
    return automated.value as T | null;
  }

  /** Requests one of the supplied literal actions from the driver or a real confirmation modal. */
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
    if (!automated.handled) return confirmAction(this.app, options);
    if (automated.value !== null && !options.actions.includes(automated.value as T)) {
      invalidResponse(request, "expected null or one of the supplied actions");
    }
    return automated.value as T | null;
  }

  /** Shows or automatically acknowledges an informational message. */
  async showMessage(options: ShowMessageOptions, interactionId?: string): Promise<void> {
    const request = { kind: "showMessage", interactionId, options } as const;
    const automated = await this.handle(request);
    if (!automated.handled) await showMessage(this.app, options);
  }

  private async handle(request: UiInteractionRequest): Promise<UiInteractionResponse> {
    if (this.driver === undefined) return { handled: false };
    return this.driver.handle(request);
  }
}

/**
 * Creates an instance-scoped UI context.
 *
 * @param app - Obsidian application used by real UI fallbacks.
 * @param options - Optional interaction driver configuration.
 */
export function createUiContext(app: App, options: UiContextOptions = {}): UiContext {
  return new UiContext(app, options);
}
