import { createDrivenUiInteractions } from "./driven-ui.js";
import type {
  UiInteractionDriver,
  UiInteractionKind,
  UiInteractionRequest,
  UiInteractionRequestOf,
  UiInteractionResultOf,
  UiInteractionResponse,
  UiInteractions,
} from "./contracts.js";

interface ScriptedUiStepBase<K extends UiInteractionKind> {
  /** Expected interaction kind. A different next request fails the test. */
  kind: K;
  /** Optional stable identifier that the request must match. */
  interactionId?: string;
}

type ScriptedUiValue<K extends UiInteractionKind> =
  | UiInteractionResultOf<K>
  | ((
      request: UiInteractionRequestOf<K>,
    ) => UiInteractionResultOf<K> | Promise<UiInteractionResultOf<K>>);

interface ScriptedUiPassthrough {
  /** Verifies the request, then invokes platform UI. */
  passthrough: true;
  /** A passed-through step cannot also supply an automated result. */
  value?: never;
}

interface ScriptedUiHandledStep<K extends UiInteractionKind> {
  /** Handles the request without platform UI. Omit this property or set it to `false`. */
  passthrough?: false;
  /** Result value or function that derives one from the kind-specific observed request. */
  value: ScriptedUiValue<K>;
}

interface ScriptedUiHandledMessageStep {
  /** Handles the request without platform UI. Omit this property or set it to `false`. */
  passthrough?: false;
  /** Optional spy callback. An acknowledged message has no result value. */
  value?: ScriptedUiValue<"showMessage">;
}

/**
 * One expected interaction with a kind-specific automated result or explicit pass-through.
 *
 * @typeParam K - Interaction kind used to infer the callback request and accepted result.
 */
export type ScriptedUiStep<K extends UiInteractionKind = UiInteractionKind> =
  K extends UiInteractionKind
    ? ScriptedUiStepBase<K> &
        (ScriptedUiPassthrough |
          (K extends "showMessage" ? ScriptedUiHandledMessageStep : ScriptedUiHandledStep<K>))
    : never;

/** Configures scripted queue behaviour. */
export interface ScriptedUiDriverOptions {
  /** Whether a request after the queue is empty throws instead of passing through. Defaults to `true`. */
  strict?: boolean;
}

/** FIFO interaction driver for deterministic unit and integration tests. */
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
    const value =
      typeof step.value === "function"
        ? await (step.value as (request: UiInteractionRequest) => unknown | Promise<unknown>)(request)
        : step.value;
    return { handled: true, value };
  }

  /** Throws when one or more expected interactions were never requested. */
  assertDone(): void {
    if (this.queue.length === 0) return;
    const pending = this.queue.map((step) => step.interactionId ?? step.kind).join(", ");
    throw new Error(`Unconsumed scripted UI interactions: ${pending}`);
  }
}

/** Creates a strict scripted UI driver by default. */
export function createScriptedUiDriver(
  steps: readonly ScriptedUiStep[],
  options: ScriptedUiDriverOptions = {},
): ScriptedUiDriver {
  return new ScriptedUiDriver(steps, options);
}

/** App-free test fixture containing a neutral UI capability and its scripted driver. */
export interface UiTestHarness {
  /** Neutral UI capability used by the application flow under test. */
  readonly ui: UiInteractions;
  /** Scripted driver that owns expectations and the request transcript. */
  readonly driver: ScriptedUiDriver;
  /** Read-only view of all observed interaction requests. */
  readonly transcript: readonly UiInteractionRequest[];
  /** Asserts that the application requested every scripted interaction. */
  assertDone(): void;
}

/**
 * Creates an App-free harness for consumer application-flow tests.
 *
 * @remarks
 * A passed-through request fails because the harness intentionally has no
 * platform UI. Use a platform adapter directly when a mixed test needs real UI.
 */
export function createUiTestHarness(
  steps: readonly ScriptedUiStep[],
  options: ScriptedUiDriverOptions = {},
): UiTestHarness {
  const driver = createScriptedUiDriver(steps, options);
  const ui = createDrivenUiInteractions({ driver });
  return {
    ui,
    driver,
    transcript: driver.transcript,
    assertDone: () => driver.assertDone(),
  };
}
