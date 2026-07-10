import type { App } from "obsidian";
import {
  DrivenUiInteractions,
  type ConfirmActionOptions,
  type PickOneOptions,
  type PromptTextOptions,
  type ShowMessageOptions,
  type UiInteractionDriver,
  type UiInteractions,
} from "@vrtmrz/ui-interactions";
import {
  confirmAction,
  pickOne,
  promptPassword,
  promptText,
  showMessage,
} from "./dialog.js";

export type {
  ConfirmActionOptions,
  PickOneOptions,
  PromptTextOptions,
  ShowMessageOptions,
  UiInteractionDriver,
  UiInteractionKind,
  UiInteractionRequest,
  UiInteractionResponse,
  UiInteractions,
} from "@vrtmrz/ui-interactions";

/** Configures an Obsidian-backed {@link UiContext}. */
export interface UiContextOptions {
  /** Optional instance-scoped driver. Omit it to always use real Obsidian UI. */
  driver?: UiInteractionDriver;
}

function createObsidianFallback(app: App): UiInteractions {
  return {
    promptText: (options: PromptTextOptions) => promptText(app, options),
    promptPassword: (options: PromptTextOptions) => promptPassword(app, options),
    pickOne: <T>(options: PickOneOptions<T>) => pickOne(app, options),
    confirmAction: <const T extends string>(options: ConfirmActionOptions<T>) =>
      confirmAction(app, options),
    showMessage: (options: ShowMessageOptions) => showMessage(app, options),
  };
}

/**
 * Obsidian implementation of the neutral UI interaction contract.
 *
 * @remarks
 * Create one context per plug-in instance or application scope. Do not place a
 * scripted driver in a class static or module global, because queued responses
 * would leak between tests, vaults, and plug-in instances.
 */
export class UiContext extends DrivenUiInteractions {
  /** Obsidian application used whenever an interaction passes through to real UI. */
  readonly app: App;

  /** Creates an Obsidian UI context with an optional interaction driver. */
  constructor(app: App, options: UiContextOptions = {}) {
    super({ driver: options.driver, fallback: createObsidianFallback(app) });
    this.app = app;
  }
}

/**
 * Creates an Obsidian adapter implementing the neutral {@link UiInteractions} contract.
 *
 * @param app - Obsidian application used by real UI fallbacks.
 * @param options - Optional instance-scoped interaction driver configuration.
 */
export function createObsidianUi(app: App, options: UiContextOptions = {}): UiInteractions {
  return new UiContext(app, options);
}

/**
 * Creates an instance-scoped Obsidian UI context.
 *
 * @param app - Obsidian application used by real UI fallbacks.
 * @param options - Optional instance-scoped interaction driver configuration.
 * @deprecated Prefer {@link createObsidianUi}; this alias is retained for source compatibility.
 */
export function createUiContext(app: App, options: UiContextOptions = {}): UiContext {
  return new UiContext(app, options);
}
