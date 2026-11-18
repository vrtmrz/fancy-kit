import { RpcError } from "./RpcError.js";
import type { RpcScheduler } from "./types.js";

interface GlobalTimerHost {
  setTimeout?: (callback: () => void, delayMs: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
}

/** Reads the timer facility lazily so importing RPC remains platform-neutral. */
export function createDefaultScheduler(): RpcScheduler {
  return {
    setTimeout(callback: () => void, delayMs: number): () => void {
      const host = globalThis as GlobalTimerHost;
      if (typeof host.setTimeout !== "function") {
        throw new RpcError(
          "unsupported-profile",
          "No timer facility is available in this runtime; supply an explicit scheduler.",
        );
      }
      const handle = host.setTimeout(callback, delayMs);
      return () => {
        if (typeof host.clearTimeout === "function") {
          host.clearTimeout(handle);
        }
      };
    },
  };
}
