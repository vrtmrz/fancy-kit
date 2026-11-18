import type { CancelSignal } from "./types.js";

/** Internal controller backing a platform-neutral {@link CancelSignal}. */
export interface CancelController {
  readonly signal: CancelSignal;
  abort(reason?: unknown): void;
  clear(): void;
}

/**
 * Creates a lightweight cancellation signal compatible with DOM/Node
 * `AbortSignal` without depending on host globals.
 */
export function createCancelController(): CancelController {
  let aborted = false;
  let abortReason: unknown = undefined;
  const listeners = new Map<() => void, () => void>();

  const signal: CancelSignal = {
    get aborted(): boolean {
      return aborted;
    },
    get reason(): unknown {
      return abortReason;
    },
    addEventListener(
      type: "abort",
      listener: () => void,
      options?: { readonly once?: boolean },
    ): void {
      if (type !== "abort") return;
      if (aborted) {
        try {
          listener();
        } catch {
          // Never allow observer errors to break cancellation paths.
        }
        return;
      }
      if (listeners.has(listener)) return;
      if (options?.once) {
        const onceWrapper = () => {
          listeners.delete(listener);
          listener();
        };
        listeners.set(listener, onceWrapper);
        return;
      }
      listeners.set(listener, listener);
    },
    removeEventListener(type: "abort", listener: () => void): void {
      if (type !== "abort") return;
      listeners.delete(listener);
    },
  };

  return {
    signal,
    abort(reason?: unknown): void {
      if (aborted) return;
      aborted = true;
      abortReason = reason;
      const snapshot = [...listeners.values()];
      listeners.clear();
      for (const listener of snapshot) {
        try {
          listener();
        } catch {
          // Diagnostic/handler abort listeners must not prevent subsequent cleanup.
        }
      }
    },
    clear(): void {
      listeners.clear();
    },
  };
}
