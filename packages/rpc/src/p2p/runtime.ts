import type { CancellationSignal, Runtime } from "../service/contracts.js";
import type { RpcAbortController } from "./types.js";
import { RpcError } from "./RpcError.js";
interface TimerHost {
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}
/** Creates platform defaults without scheduling anything or acquiring a connection. */
export function createRuntime(overrides: Partial<Runtime> = {}): Runtime {
  return {
    scheduleTimeout:
      overrides.scheduleTimeout ??
      ((callback, delayMs) => {
        const host = globalThis as unknown as TimerHost;
        const handle = host.setTimeout(callback, delayMs);
        return () => host.clearTimeout(handle);
      }),
    createId:
      overrides.createId ??
      ((kind) =>
        `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`),
  };
}
/** Uses native cancellation without requiring ambient DOM declarations. */
export function createHostAbortController<
  S extends CancellationSignal,
>(): RpcAbortController<S> {
  const host = globalThis as unknown as {
    AbortController?: new () => RpcAbortController<S>;
  };
  if (!host.AbortController) {
    throw new RpcError(
      "PROTOCOL_ERROR",
      "Supply createAbortController in this host",
    );
  }
  return new host.AbortController();
}
