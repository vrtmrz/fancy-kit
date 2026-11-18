import { promiseWithResolvers } from "octagonal-wheels/promises";
import { RpcError } from "../RpcError.js";
import type { CancelSignal } from "../types.js";

/** Shared receiving capacity reserved by readers before they request chunks. */
export interface WorkerStreamBudget {
  /** Maximum total byte charge that concurrent readers can reserve. */
  readonly maxBytes: number;
}

interface BudgetWaiter {
  readonly bytes: number;
  readonly signal?: CancelSignal;
  readonly promise: ReturnType<typeof promiseWithResolvers<() => void>>;
  state: "queued" | "granted" | "released" | "cancelled";
  readonly onAbort: () => void;
}

interface BudgetState {
  readonly budget: WorkerStreamBudget;
  readonly waiters: BudgetWaiter[];
  reservedBytes: number;
}

const states = new WeakMap<WorkerStreamBudget, BudgetState>();

/**
 * Creates a FIFO byte budget shared by any number of Worker stream readers.
 *
 * @param maxBytes - Maximum reserved chunk capacity. Must be a finite,
 * non-negative safe integer.
 */
export function createWorkerStreamBudget(maxBytes: number): WorkerStreamBudget {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new RpcError(
      "invalid-contract",
      "Worker stream budget must be a non-negative safe integer.",
    );
  }

  const budget = Object.freeze({ maxBytes });
  states.set(budget, { budget, waiters: [], reservedBytes: 0 });
  return budget;
}

/** Reserves capacity in FIFO order and releases it on cancellation or disposal. */
export function reserveWorkerStreamBudget(
  budget: WorkerStreamBudget,
  bytes: number,
  signal?: CancelSignal,
): Promise<() => void> {
  const state = states.get(budget);
  if (state === undefined) {
    return Promise.reject(
      new RpcError("invalid-contract", "Worker stream budget was not created by this package."),
    );
  }
  const validState = state;
  if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > budget.maxBytes) {
    return Promise.reject(
      new RpcError(
        "invalid-contract",
        "Worker stream reservation must fit within its byte budget.",
      ),
    );
  }
  if (signal?.aborted === true) {
    return Promise.reject(cancellationError(signal.reason));
  }

  const promise = promiseWithResolvers<() => void>();
  let waiter!: BudgetWaiter;

  function detachAbortListener(): void {
    if (signal !== undefined) {
      signal.removeEventListener("abort", waiter.onAbort);
    }
  }

  function onAbort(): void {
    if (waiter.state === "queued") {
      waiter.state = "cancelled";
      const index = validState.waiters.indexOf(waiter);
      if (index !== -1) {
        validState.waiters.splice(index, 1);
      }
      detachAbortListener();
      promise.reject(cancellationError(signal?.reason));
      drain(validState);
      return;
    }
    if (waiter.state === "granted") {
      waiter.state = "released";
      detachAbortListener();
      validState.reservedBytes -= bytes;
      drain(validState);
    }
  }

  waiter = {
    bytes,
    ...(signal !== undefined ? { signal } : {}),
    promise,
    state: "queued",
    onAbort,
  };

  if (signal !== undefined) {
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
    }
  }
  if (waiter.state === "queued") {
    validState.waiters.push(waiter);
    drain(validState);
  }

  return promise.promise;
}

function drain(state: BudgetState): void {
  while (state.waiters.length > 0) {
    const waiter = state.waiters[0]!;
    if (waiter.state !== "queued") {
      state.waiters.shift();
      continue;
    }
    if (state.reservedBytes + waiter.bytes > state.budget.maxBytes) {
      return;
    }
    state.waiters.shift();
    waiter.state = "granted";
    state.reservedBytes += waiter.bytes;
    waiter.promise.resolve(() => {
      if (waiter.state !== "granted") return;
      waiter.state = "released";
      if (waiter.signal !== undefined) {
        waiter.signal.removeEventListener("abort", waiter.onAbort);
      }
      state.reservedBytes -= waiter.bytes;
      drain(state);
    });
  }
}

function cancellationError(reason: unknown): RpcError {
  if (reason instanceof RpcError) return reason;
  return new RpcError("aborted", "Worker stream byte reservation was cancelled.", {
    ...(reason !== undefined ? { cause: reason } : {}),
  });
}
