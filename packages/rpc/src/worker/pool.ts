import {
  promiseWithResolvers,
  type PromiseWithResolvers,
} from "octagonal-wheels/promises";
import { RpcError } from "../RpcError.js";
import type { CancelSignal } from "../types.js";

/**
 * Minimum lifetime contract required for a connection managed by a Worker
 * pool.
 */
export interface WorkerPoolConnection<Client> {
  /** Resolves when the remote client has completed its connection handshake. */
  readonly ready: Promise<Client>;
  /** Aborts when this connection can no longer serve RPC calls. */
  readonly signal: CancelSignal;
  /** Closes this connection and optionally records the terminal RPC reason. */
  close(reason?: RpcError): void;
}

/** Options for {@link createWorkerPool}. */
export interface WorkerPoolOptions<Connection extends WorkerPoolConnection<unknown>> {
  /** Fixed number of connection slots; must be a positive integer. */
  readonly size: number;
  /**
   * Creates one owned connection for a slot. A synchronous throw fails that
   * slot for the current demand; a later demand may try that slot again.
   * Calls to `start()` or `acquire()` during creation share the current pass.
   */
  readonly createConnection: () => Connection;
}

/** A checked-out Worker connection and its ready remote client. */
export interface WorkerPoolLease<
  Connection extends WorkerPoolConnection<unknown>,
  Client,
> {
  /** Connection selected for this lease. */
  readonly connection: Connection;
  /** Remote client resolved by the selected connection's readiness promise. */
  readonly client: Client;
  /**
   * Releases this lease's placement count. Repeated calls have no effect;
   * releasing does not cancel or close an RPC call.
   */
  release(): void;
}

/** Fixed-capacity, lazily populated pool of ready Worker connections. */
export interface WorkerPool<
  Connection extends WorkerPoolConnection<unknown>,
  Client,
> {
  /**
   * Starts missing slots and resolves with their ready connections in slot
   * order. It rejects if any slot in this startup pass fails; healthy slots
   * remain available to later acquisitions.
   */
  start(): Promise<Connection[]>;
  /**
   * Acquires one ready connection, preferring the slot with the fewest live
   * leases and rotating ties. It waits only when no slot is ready. Each
   * acquisition uses the connections from its own startup pass and rejects
   * with that pass's latest failure if none becomes usable.
   */
  acquire(): Promise<WorkerPoolLease<Connection, Client>>;
  /**
   * Permanently closes the pool, settles pending operations, and closes each
   * currently owned connection at most once. The first call determines the
   * terminal reason.
   */
  close(reason?: RpcError): void;
}

interface PoolFailure {
  readonly reason: unknown;
  readonly sequence: number;
}

interface CandidateWaits<Client> {
  readonly ready: PromiseWithResolvers<Client>;
}

type CandidateState<Client> =
  | (CandidateWaits<Client> & { readonly phase: "starting" })
  | (CandidateWaits<Client> & { readonly phase: "ready"; readonly client: Client })
  | (CandidateWaits<Client> & { readonly phase: "ended"; readonly failure: PoolFailure });

interface Candidate<Connection extends WorkerPoolConnection<unknown>> {
  readonly connection: Connection;
  readonly slotIndex: number;
  lifecycle: CandidateState<Awaited<Connection["ready"]>>;
  leases: number;
  removeAbortListener: (() => void) | undefined;
}

type ReadyCandidate<Connection extends WorkerPoolConnection<unknown>> =
  Candidate<Connection> & {
    lifecycle: Extract<
      CandidateState<Awaited<Connection["ready"]>>,
      { readonly phase: "ready" }
    >;
  };

function isReadyCandidate<Connection extends WorkerPoolConnection<unknown>>(
  candidate: Candidate<Connection> | undefined,
): candidate is ReadyCandidate<Connection> {
  return candidate !== undefined && candidate.lifecycle.phase === "ready";
}

interface Slot<Connection extends WorkerPoolConnection<unknown>> {
  current: Candidate<Connection> | undefined;
}

function disconnectedError(message: string): RpcError {
  return new RpcError("disconnected", message);
}

function signalEndReason(signal: CancelSignal, message: string): unknown {
  return signal.reason === undefined ? disconnectedError(message) : signal.reason;
}

/**
 * Creates a fixed-size pool which starts connections only when `start()` or
 * `acquire()` is first called.
 *
 * Each call to `acquire()` creates at most one replacement attempt for each
 * ended or empty slot. Failed attempts are reported to that call if no
 * connection becomes available; the pool retries only on later demand.
 *
 * @param options - Fixed slot count and owned connection factory.
 * @returns Pool operations for prewarming, leasing, and terminal shutdown.
 */
export function createWorkerPool<
  Connection extends WorkerPoolConnection<unknown>,
>(
  options: WorkerPoolOptions<Connection>,
): WorkerPool<Connection, Awaited<Connection["ready"]>> {
  if (!Number.isInteger(options.size) || options.size <= 0) {
    throw new RangeError("Worker pool size must be a positive integer.");
  }

  type Client = Awaited<Connection["ready"]>;
  interface StartupSnapshot {
    readonly candidates: readonly (Candidate<Connection> | undefined)[];
    readonly failure: PoolFailure | undefined;
  }
  interface SlotFill {
    failure: PoolFailure | undefined;
    waiter: PromiseWithResolvers<StartupSnapshot> | undefined;
  }

  const slots: Array<Slot<Connection>> = Array.from(
    { length: options.size },
    () => ({ current: undefined }),
  );
  let closed = false;
  let closeReason: RpcError | undefined;
  let nextTieStart = 0;
  let failureSequence = 0;
  let slotFill: SlotFill | undefined;

  function closeReasonOrDefault(): RpcError {
    return closeReason ?? disconnectedError("Worker pool is closed.");
  }

  function recordFailure(reason: unknown): PoolFailure {
    failureSequence += 1;
    const failure = { reason, sequence: failureSequence };
    if (slotFill !== undefined) {
      slotFill.failure = failure;
    }
    return failure;
  }

  function newestFailure(snapshot: StartupSnapshot): unknown {
    let newest = snapshot.failure;
    for (const candidate of snapshot.candidates) {
      const lifecycle = candidate?.lifecycle;
      if (lifecycle?.phase === "ended" &&
        (newest === undefined || lifecycle.failure.sequence > newest.sequence)) {
        newest = lifecycle.failure;
      }
    }
    return newest === undefined ? disconnectedError("No Worker connection is available.") : newest.reason;
  }

  function closeConnection(connection: Connection, reason?: RpcError): void {
    try {
      connection.close(reason);
    } catch {
      // Keep shutdown of the remaining slots and pending operations reliable.
    }
  }

  function removeAbortListener(candidate: Candidate<Connection>): void {
    const remove = candidate.removeAbortListener;
    candidate.removeAbortListener = undefined;
    try {
      remove?.();
    } catch {
      // The candidate is already inactive even if a host signal rejects cleanup.
    }
  }

  function getReadyCandidate(
    candidates: StartupSnapshot["candidates"],
  ): ReadyCandidate<Connection> | undefined {
    let minimum = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      if (!isReadyCandidate(candidate)) {
        continue;
      }
      if (candidate.leases < minimum) {
        minimum = candidate.leases;
      }
    }
    if (minimum === Number.POSITIVE_INFINITY) {
      return undefined;
    }
    for (let offset = 0; offset < slots.length; offset += 1) {
      const slotIndex = (nextTieStart + offset) % slots.length;
      const candidate = candidates[slotIndex];
      if (isReadyCandidate(candidate) && candidate.leases === minimum) {
        nextTieStart = (slotIndex + 1) % slots.length;
        return candidate;
      }
    }
    return undefined;
  }

  function createLease(candidate: ReadyCandidate<Connection>): WorkerPoolLease<Connection, Client> {
    candidate.leases += 1;
    let released = false;
    return {
      connection: candidate.connection,
      client: candidate.lifecycle.client,
      release(): void {
        if (released) {
          return;
        }
        released = true;
        candidate.leases = Math.max(0, candidate.leases - 1);
      },
    };
  }

  function markEnded(
    slot: Slot<Connection>,
    candidate: Candidate<Connection>,
    reason: unknown,
    closeFailedStartup: boolean,
  ): void {
    const previous = candidate.lifecycle;
    if (slot.current !== candidate || previous.phase === "ended") {
      return;
    }
    candidate.lifecycle = { ready: previous.ready, phase: "ended", failure: recordFailure(reason) };
    slot.current = undefined;
    removeAbortListener(candidate);
    previous.ready.reject(reason);
    if (closeFailedStartup) {
      closeConnection(
        candidate.connection,
        reason instanceof RpcError ? reason : undefined,
      );
    }
  }

  function startSlot(slot: Slot<Connection>, slotIndex: number): void {
    if (closed) {
      return;
    }
    const existing = slot.current;
    if (existing !== undefined) {
      const signal = existing.connection.signal;
      if (!signal.aborted) {
        return;
      }
      markEnded(slot, existing, signalEndReason(signal, "Worker connection ended before it could be used."), false);
      if (closed) {
        return;
      }
    }
    let connection: Connection;
    try {
      connection = options.createConnection();
    } catch (reason) {
      recordFailure(reason === undefined
        ? disconnectedError("Worker connection creation failed.")
        : reason);
      return;
    }

    if (closed) {
      try {
        connection.close(closeReasonOrDefault());
      } catch {
        // A re-entrant close has already made the pool terminal.
      }
      return;
    }

    const candidate: Candidate<Connection> = {
      connection,
      slotIndex,
      lifecycle: {
        phase: "starting",
        ready: promiseWithResolvers<Client>(),
      },
      leases: 0,
      removeAbortListener: undefined,
    };
    slot.current = candidate;
    void candidate.lifecycle.ready.promise.catch(() => undefined);

    try {
      const signal = connection.signal;
      const onAbort = () => {
        const reason = signalEndReason(
          signal,
          "Worker connection ended before it could be used.",
        );
        markEnded(slot, candidate, reason, false);
      };
      signal.addEventListener("abort", onAbort, { once: true });
      candidate.removeAbortListener = () => signal.removeEventListener("abort", onAbort);
      if (signal.aborted) {
        onAbort();
      }

      Promise.resolve(connection.ready as Promise<Client>).then(
        (client) => {
          const lifecycle = candidate.lifecycle;
          if (slot.current !== candidate || lifecycle.phase !== "starting" || closed) {
            return;
          }
          if (signal.aborted) {
            onAbort();
            return;
          }
          candidate.lifecycle = { ...lifecycle, phase: "ready", client };
          lifecycle.ready.resolve(client);
        },
        (reason: unknown) => {
          const failure = reason === undefined
            ? disconnectedError("Worker connection failed before becoming ready.")
            : reason;
          markEnded(slot, candidate, failure, true);
        },
      );
    } catch (reason) {
      const failure = reason === undefined
        ? disconnectedError("Worker connection setup failed.")
        : reason;
      markEnded(slot, candidate, failure, true);
    }
  }

  function waitForSlotFill(): Promise<StartupSnapshot> | undefined {
    if (slotFill !== undefined) {
      slotFill.waiter ??= promiseWithResolvers<StartupSnapshot>();
      return slotFill.waiter.promise;
    }
  }

  function ensureSlots(): StartupSnapshot {
    const fill: SlotFill = { failure: undefined, waiter: undefined };
    slotFill = fill;
    let snapshot: StartupSnapshot;
    try {
      for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
        startSlot(slots[slotIndex]!, slotIndex);
      }
    } finally {
      slotFill = undefined;
      snapshot = { candidates: slots.map((slot) => slot.current), failure: fill.failure };
      fill.waiter?.resolve(snapshot);
    }
    return snapshot;
  }

  function start(): Promise<Connection[]> {
    if (closed) {
      return Promise.reject(closeReasonOrDefault());
    }
    const fill = waitForSlotFill();
    if (fill !== undefined) {
      return fill.then(waitForStartedSlots);
    }
    return waitForStartedSlots(ensureSlots());
  }

  function waitForStartedSlots(snapshot: StartupSnapshot): Promise<Connection[]> {
    if (closed) {
      return Promise.reject(closeReasonOrDefault());
    }
    const candidates = snapshot.candidates.filter((candidate) => candidate !== undefined);
    if (candidates.length !== slots.length) {
      return Promise.reject(newestFailure(snapshot));
    }
    const startFailure = promiseWithResolvers<unknown>();
    const failure = startFailure.promise.then((reason) => {
      throw reason;
    });
    const removeListeners: Array<() => void> = [];
    try {
      for (const candidate of candidates) {
        const signal = candidate.connection.signal;
        const onAbort = () => {
          startFailure.reject(signalEndReason(
            signal,
            "Worker connection ended during pool startup.",
          ));
        };
        signal.addEventListener("abort", onAbort, { once: true });
        removeListeners.push(() => signal.removeEventListener("abort", onAbort));
        if (signal.aborted) {
          onAbort();
        }
      }
    } catch (reason) {
      startFailure.reject(reason);
    }

    const readiness = Promise.all(
      candidates.map((candidate) => candidate.lifecycle.ready.promise),
    ).then(() => {
      if (closed) {
        throw closeReasonOrDefault();
      }
      for (const candidate of candidates) {
        const slot = slots[candidate.slotIndex]!;
        const lifecycle = candidate.lifecycle;
        const signal = candidate.connection.signal;
        if (slot.current !== candidate || lifecycle.phase !== "ready" || signal.aborted) {
          if (lifecycle.phase === "ended") {
            throw lifecycle.failure.reason;
          }
          if (signal.aborted) {
            throw signalEndReason(signal, "Worker connection ended during pool startup.");
          }
          throw newestFailure(snapshot);
        }
      }
      return candidates.map((candidate) => candidate.connection);
    });
    return Promise.race([readiness, failure]).finally(() => {
      for (const remove of removeListeners) {
        try {
          remove();
        } catch {
          // The startup result is settled even if a host signal rejects cleanup.
        }
      }
      startFailure.resolve(undefined);
    });
  }

  async function acquire(): Promise<WorkerPoolLease<Connection, Client>> {
    if (closed) {
      throw closeReasonOrDefault();
    }
    const fill = waitForSlotFill();
    const snapshot = fill === undefined ? ensureSlots() : await fill;
    while (!closed) {
      const candidate = getReadyCandidate(snapshot.candidates);
      if (candidate !== undefined) {
        return createLease(candidate);
      }
      const starting = snapshot.candidates.flatMap((item) =>
        item?.lifecycle.phase === "starting" ? [item] : [],
      );
      if (starting.length === 0) {
        throw newestFailure(snapshot);
      }
      await Promise.race(starting.map((item) =>
        item.lifecycle.ready.promise.then(() => undefined, () => undefined),
      ));
    }
    throw closeReasonOrDefault();
  }

  function close(reason?: RpcError): void {
    if (closed) {
      return;
    }
    closed = true;
    closeReason = reason ?? disconnectedError("Worker pool is closed.");
    const failure = recordFailure(closeReason);
    for (const slot of slots) {
      const candidate = slot.current;
      slot.current = undefined;
      if (candidate === undefined) {
        continue;
      }
      const lifecycle = candidate.lifecycle;
      candidate.lifecycle = { ready: lifecycle.ready, phase: "ended", failure };
      removeAbortListener(candidate);
      if (lifecycle.phase === "starting") {
        lifecycle.ready.reject(closeReason);
      }
      closeConnection(candidate.connection, closeReason);
    }
  }

  return { start, acquire, close };
}
