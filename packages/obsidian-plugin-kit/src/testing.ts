import type {
  UiInteractionDriver,
  UiInteractionKind,
  UiInteractionRequest,
  UiInteractionResponse,
} from "./ui-context.js";

/** One expected interaction and its optional automated response. */
export interface ScriptedUiStep {
  /** Expected interaction kind. A different next request fails the test. */
  kind: UiInteractionKind;
  /** Optional stable identifier that the request must match. */
  interactionId?: string;
  /**
   * Response value or function that derives one from the observed request.
   * Omit the value for interactions such as `showMessage` that return nothing.
   */
  value?: unknown | ((request: UiInteractionRequest) => unknown | Promise<unknown>);
  /** Whether to record and verify this step but then open the real Obsidian UI. Defaults to `false`. */
  passthrough?: boolean;
}

/** Configures scripted queue behaviour. */
export interface ScriptedUiDriverOptions {
  /** Whether an interaction after the queue is empty throws instead of passing through. Defaults to `true`. */
  strict?: boolean;
}

/**
 * FIFO interaction driver for deterministic unit and integration tests.
 *
 * @remarks
 * This driver is intentionally exported from the `testing` entry point rather
 * than the package root. Create a fresh instance for every test and call
 * {@link assertDone} before the test ends.
 */
export class ScriptedUiDriver implements UiInteractionDriver {
  /** Every request observed by this driver, including passed-through requests. */
  readonly transcript: UiInteractionRequest[] = [];
  private readonly queue: ScriptedUiStep[];
  private readonly strict: boolean;

  /** Creates a driver with a defensive copy of the expected steps. */
  constructor(steps: readonly ScriptedUiStep[], options: ScriptedUiDriverOptions = {}) {
    this.queue = [...steps];
    this.strict = options.strict ?? true;
  }

  /** Number of scripted steps that have not been consumed. */
  get remaining(): number {
    return this.queue.length;
  }

  /** Records a request, verifies the next step, and returns its response. */
  async handle(request: UiInteractionRequest): Promise<UiInteractionResponse> {
    this.transcript.push(request);
    const step = this.queue.shift();
    if (step === undefined) {
      if (this.strict) throw new Error(`Unexpected UI interaction: ${request.kind}`);
      return { handled: false };
    }
    if (step.kind !== request.kind) {
      throw new Error(`Expected UI interaction ${step.kind}, received ${request.kind}`);
    }
    if (step.interactionId !== undefined && step.interactionId !== request.interactionId) {
      throw new Error(
        `Expected UI interaction id ${step.interactionId}, received ${request.interactionId ?? "<none>"}`,
      );
    }
    if (step.passthrough) return { handled: false };
    const value = typeof step.value === "function" ? await step.value(request) : step.value;
    return { handled: true, value };
  }

  /** Throws when one or more expected interactions were never requested. */
  assertDone(): void {
    if (this.queue.length === 0) return;
    const pending = this.queue.map((step) => step.interactionId ?? step.kind).join(", ");
    throw new Error(`Unconsumed scripted UI interactions: ${pending}`);
  }
}

/**
 * Creates a strict scripted UI driver by default.
 *
 * @param steps - Ordered interaction expectations and responses.
 * @param options - Queue strictness configuration.
 */
export function createScriptedUiDriver(
  steps: readonly ScriptedUiStep[],
  options: ScriptedUiDriverOptions = {},
): ScriptedUiDriver {
  return new ScriptedUiDriver(steps, options);
}
