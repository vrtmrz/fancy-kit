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
   * leases and rotating ties. It waits only when no slot is ready.
   */
  acquire(): Promise<WorkerPoolLease<Connection, Client>>;
  /**
   * Permanently closes the pool, settles pending operations, and closes each
   * currently owned connection at most once. The first call determines the
   * terminal reason.
   */
  close(reason?: RpcError): void;
}

interface CandidateWaits<Client> {
  readonly ready: PromiseWithResolvers<Client>;
}

type CandidateState<Client> =
  | (CandidateWaits<Client> & { readonly phase: "starting" })
  | (CandidateWaits<Client> & { readonly phase: "ready"; readonly client: Client })
  | (CandidateWaits<Client> & { readonly phase: "ended"; readonly reason: unknown });

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

  const slots: Array<Slot<Connection>> = Array.from(
    { length: options.size },
    () => ({ current: undefined }),
  );
  let closed = false;
  let closeReason: RpcError | undefined;
  let nextTieStart = 0;
  let hasFailure = false;
  let lastFailure: unknown;

  function closeReasonOrDefault(): RpcError {
    return closeReason ?? disconnectedError("Worker pool is closed.");
  }

  function recordFailure(reason: unknown): void {
    hasFailure = true;
    lastFailure = reason;
  }

  function newestFailure(): unknown {
    return hasFailure ? lastFailure : disconnectedError("No Worker connection is available.");
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

  function getReadyCandidate(): ReadyCandidate<Connection> | undefined {
    let minimum = Number.POSITIVE_INFINITY;
    for (const slot of slots) {
      const candidate = slot.current;
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
      const candidate = slots[slotIndex]!.current;
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
    candidate.lifecycle = { ...previous, phase: "ended", reason };
    slot.current = undefined;
    recordFailure(reason);
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
    if (closed || slot.current !== undefined) {
      return;
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

  function ensureSlots(): void {
    if (closed) {
      return;
    }
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
      startSlot(slots[slotIndex]!, slotIndex);
    }
  }

  function start(): Promise<Connection[]> {
    if (closed) {
      return Promise.reject(closeReasonOrDefault());
    }
    ensureSlots();
    if (closed) {
      return Promise.reject(closeReasonOrDefault());
    }
    const candidates = slots.map((slot) => slot.current);
    if (candidates.some((candidate) => candidate === undefined)) {
      return Promise.reject(newestFailure());
    }
    const snapshot = candidates as Candidate<Connection>[];
    const startFailure = promiseWithResolvers<unknown>();
    const failure = startFailure.promise.then((reason) => {
      throw reason;
    });
    const removeListeners: Array<() => void> = [];
    try {
      for (const candidate of snapshot) {
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
      snapshot.map((candidate) => candidate.lifecycle.ready.promise),
    ).then(() => {
      if (closed) {
        throw closeReasonOrDefault();
      }
      for (const candidate of snapshot) {
        const slot = slots[candidate.slotIndex]!;
        const lifecycle = candidate.lifecycle;
        const signal = candidate.connection.signal;
        if (slot.current !== candidate || lifecycle.phase !== "ready" || signal.aborted) {
          if (lifecycle.phase === "ended") {
            throw lifecycle.reason;
          }
          if (signal.aborted) {
            throw signalEndReason(signal, "Worker connection ended during pool startup.");
          }
          throw newestFailure();
        }
      }
      return snapshot.map((candidate) => candidate.connection);
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
    ensureSlots();
    while (!closed) {
      const candidate = getReadyCandidate();
      if (candidate !== undefined) {
        return createLease(candidate);
      }
      const starting = slots.flatMap((slot) =>
        slot.current?.lifecycle.phase === "starting" ? [slot.current] : [],
      );
      if (starting.length === 0) {
        throw newestFailure();
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
    for (const slot of slots) {
      const candidate = slot.current;
      slot.current = undefined;
      if (candidate === undefined) {
        continue;
      }
      const lifecycle = candidate.lifecycle;
      candidate.lifecycle = { ...lifecycle, phase: "ended", reason: closeReason };
      removeAbortListener(candidate);
      if (lifecycle.phase === "starting") {
        lifecycle.ready.reject(closeReason);
      }
      closeConnection(candidate.connection, closeReason);
    }
  }

  return { start, acquire, close };
}
