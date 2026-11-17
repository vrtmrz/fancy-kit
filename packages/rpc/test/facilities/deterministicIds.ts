import type { RpcIdGenerator } from "../../src/types.js";

/** Deterministic sequential identifier generator for tests. */
export interface DeterministicIdSource {
  /** Generator callback compatible with `CreateRpcEndpointOptions.generateId`. */
  readonly next: RpcIdGenerator;
  /** Total number of identifiers emitted since creation or last reset. */
  readonly count: number;
  /** Resets the internal counter back to zero. */
  reset(): void;
}

/**
 * Creates a deterministic ID source producing `<prefix>-1`, `<prefix>-2`, ...
 *
 * @param prefix - Prefix prepended to the sequential counter.
 */
export function createDeterministicIdSource(prefix = "id"): DeterministicIdSource {
  let counter = 0;
  return {
    next: () => {
      counter += 1;
      return `${prefix}-${counter}`;
    },
    get count(): number {
      return counter;
    },
    reset(): void {
      counter = 0;
    },
  };
}
