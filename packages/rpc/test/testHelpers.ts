import { createCancelController } from "../src/cancelSignal.js";
import type { CancelSignal, RpcCodec, RpcEnvelope } from "../src/types.js";

/** Instrumented cancellation source verifying abort-listener cleanup returns to zero. */
export interface TrackedCancelSource {
  readonly signal: CancelSignal;
  readonly activeListenerCount: number;
  abort(reason?: unknown): void;
}

/**
 * Creates a neutral {@link CancelSignal} controller tracking listener
 * registrations and removals across terminal RPC call paths.
 */
export function createTrackedCancelSource(): TrackedCancelSource {
  const controller = createCancelController();
  const active = new Map<() => void, () => void>();

  const trackedSignal: CancelSignal = {
    get aborted(): boolean {
      return controller.signal.aborted;
    },
    get reason(): unknown {
      return controller.signal.reason;
    },
    addEventListener(type, listener, options): void {
      if (type !== "abort") return;
      if (controller.signal.aborted) {
        controller.signal.addEventListener(type, listener, options);
        return;
      }
      if (active.has(listener)) return;
      const wrapper = options?.once
        ? () => {
            active.delete(listener);
            listener();
          }
        : listener;
      active.set(listener, wrapper);
      controller.signal.addEventListener("abort", wrapper);
    },
    removeEventListener(type, listener): void {
      if (type !== "abort") return;
      const wrapper = active.get(listener);
      if (wrapper !== undefined) {
        active.delete(listener);
        controller.signal.removeEventListener("abort", wrapper);
      }
    },
  };

  return {
    signal: trackedSignal,
    get activeListenerCount(): number {
      return active.size;
    },
    abort(reason?: unknown): void {
      active.clear();
      controller.abort(reason);
    },
  };
}

/** Direct structured-envelope codec (simulates structured-clone / in-memory channels). */
export function createIdentityCodec(): RpcCodec<RpcEnvelope, RpcEnvelope> {
  return {
    encode: (envelope) => envelope,
    decode: (wire) => wire as RpcEnvelope,
  };
}

/** JSON-serialised string codec (simulates text channels / network wires). */
export function createJsonStringCodec(): RpcCodec<RpcEnvelope, string> {
  return {
    encode: (envelope) => JSON.stringify(envelope),
    decode: (wire) => {
      if (typeof wire !== "string") {
        throw new TypeError("Expected wire payload string.");
      }
      return JSON.parse(wire) as RpcEnvelope;
    },
  };
}
