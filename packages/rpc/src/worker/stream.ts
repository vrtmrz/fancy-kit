import { promiseWithResolvers } from "octagonal-wheels/promises";
import { createCancelController } from "../cancelSignal.js";
import { isValidSerializedError } from "../endpoint/envelopes.js";
import { RpcError, type RpcErrorCode } from "../RpcError.js";
import { serialiseRpcError, type RpcSerializedError } from "../errors.js";
import { createDefaultScheduler } from "../scheduler.js";
import { withTransfer, type WithTransfer } from "../transfer.js";
import type { CancelSignal, RpcScheduler } from "../types.js";
import type { MessageEventLike, MessagePortLike, WorkerTransferPort } from "../worker.types.js";
import {
  createWorkerStreamBudget,
  reserveWorkerStreamBudget,
  type WorkerStreamBudget,
} from "./stream.budget.js";

export { createWorkerStreamBudget };
export type { WorkerStreamBudget };

/** A transferable message port used for one Worker stream. */
export type WorkerStreamPort = MessagePortLike<never> & WorkerTransferPort;

/** Values transferred as individual chunks over a Worker stream port. */
export type WorkerStreamChunk = string | Uint8Array<ArrayBuffer>;

/** Options for {@link serveWorkerStream}. */
export interface ServeWorkerStreamOptions {
  /** Creates a fresh, dedicated channel for this stream. */
  readonly createChannel: () => {
    readonly port1: WorkerStreamPort;
    readonly port2: WorkerStreamPort;
  };
  /**
   * Synchronously creates the async iterable on the first pull. Its iterator's
   * `return()` is called at most once after early termination, with `signal`
   * aborted first; a pending `next()` should observe that signal to stop promptly.
   */
  readonly createSource: (signal: CancelSignal) => AsyncIterable<WorkerStreamChunk>;
  /**
   * Maximum charge for one chunk. Strings cost two bytes per UTF-16 code unit;
   * byte chunks cost their backing `ArrayBuffer` size. Use the same limit at both ends.
   */
  readonly maxChunkBytes: number;
  /**
   * Transfers byte chunks instead of cloning them. Defaults to `false`. When
   * enabled, each byte view must exclusively cover its complete `ArrayBuffer`.
   */
  readonly transferChunks?: boolean;
  /** Sends a structured failure and aborts the source when the connection ends. */
  readonly signal?: CancelSignal;
  /**
   * Time allowed to claim the port, measured from this function call so it also
   * covers a lost or delayed RPC reply. Defaults to 30 seconds.
   */
  readonly claimTimeoutMs?: number;
  /** Scheduler used for the unclaimed-port deadline. */
  readonly scheduler?: RpcScheduler;
}

/** Options for {@link readWorkerStream}. */
export interface ReadWorkerStreamOptions {
  /** The transferred receiving end of a stream channel. */
  readonly port: WorkerStreamPort;
  /** Maximum chunk charge, using the same limit supplied to `serveWorkerStream`. */
  readonly maxChunkBytes: number;
  /** Aborts the read when the owning connection ends. */
  readonly signal?: CancelSignal;
  /**
   * Shared receiving memory capacity. Each read reserves `maxChunkBytes` before
   * sending its pull and releases the reservation on delivery or termination.
   */
  readonly budget?: WorkerStreamBudget;
}

type StreamError = RpcSerializedError;
type StreamMessage =
  | { readonly version: 1; readonly type: "claim" }
  | { readonly version: 1; readonly type: "pull" }
  | { readonly version: 1; readonly type: "cancel"; readonly error?: StreamError }
  | { readonly version: 1; readonly type: "chunk"; readonly value: unknown }
  | { readonly version: 1; readonly type: "end" }
  | { readonly version: 1; readonly type: "error"; readonly error: StreamError };

/**
 * Creates a source side and returns the reading port with explicit ownership
 * transfer. Source generation begins only when the receiver requests a chunk.
 *
 * @param options - Channel, source, chunk limit, cancellation, and claim deadline.
 */
export function serveWorkerStream(
  options: ServeWorkerStreamOptions,
): WithTransfer<WorkerStreamPort, WorkerTransferPort> {
  const { createSource, maxChunkBytes, signal, transferChunks = false } = options;
  validateChunkLimit(maxChunkBytes);
  if (signal?.aborted) {
    throw cancellationError(signal.reason, "Worker stream connection ended.");
  }
  const claimTimeoutMs = options.claimTimeoutMs ?? 30_000;
  if (!Number.isSafeInteger(claimTimeoutMs) || claimTimeoutMs < 0) {
    throw new RpcError("invalid-contract", "Worker stream claim timeout must be a non-negative safe integer.");
  }

  let channel: ReturnType<ServeWorkerStreamOptions["createChannel"]>;
  try {
    channel = options.createChannel();
  } catch (error) {
    throw asRpcError(error, "internal-error", "Could not create a Worker stream channel.");
  }
  const { port1: producerPort, port2: readerPort } = channel;
  if (!isWorkerStreamPort(producerPort) || !isWorkerStreamPort(readerPort) || producerPort === readerPort) {
    closeUnknownPort(producerPort);
    if (producerPort !== readerPort) closeUnknownPort(readerPort);
    throw new RpcError("invalid-contract", "Channel factory must return two distinct message ports.");
  }

  const sourceController = createCancelController();
  const scheduler = options.scheduler ?? createDefaultScheduler();
  let finished = false;
  let claimed = false;
  let pullPending = false;
  let iterator: AsyncIterator<WorkerStreamChunk> | undefined;
  let iteratorReturned = false;
  let cancelClaimTimer: (() => void) | undefined;
  let removeSignalListener: (() => void) | undefined;

  function cancelClaimDeadline(): void {
    const cancel = cancelClaimTimer;
    cancelClaimTimer = undefined;
    try {
      cancel?.();
    } catch {
      // Timer cancellation failure must not interrupt stream cleanup.
    }
  }

  function close(port: WorkerStreamPort): void {
    try {
      void Promise.resolve(port.close()).catch(() => undefined);
    } catch {
      // The other owned port still needs to close if this one was detached.
    }
  }

  function removeListeners(): void {
    try {
      producerPort.removeEventListener("message", onMessage);
    } catch {
      // Cleanup continues if the host has detached the port.
    }
    try {
      removeSignalListener?.();
    } catch {
      // Cleanup continues if the supplied cancellation source rejects removal.
    }
    removeSignalListener = undefined;
  }

  function returnSource(): void {
    if (iteratorReturned || iterator?.return === undefined) return;
    iteratorReturned = true;
    try {
      void Promise.resolve(iterator.return()).catch(() => undefined);
    } catch {
      // A source cleanup failure must not keep its ports open.
    }
  }

  function finish(
    error: RpcError | undefined,
    options: { readonly early: boolean; readonly notifyReader: boolean },
  ): void {
    if (finished) return;
    finished = true;
    cancelClaimDeadline();
    removeListeners();
    if (options.early) {
      sourceController.abort(error);
      returnSource();
    } else {
      sourceController.clear();
    }
    if (options.notifyReader && error !== undefined) {
      try {
        send(producerPort, { version: 1, type: "error", error: serialiseRpcError(error) });
      } catch {
        // A peer which cannot receive the failure must not prevent local teardown.
      }
    }
    close(producerPort);
    if (!claimed) close(readerPort);
  }

  function fail(error: RpcError): void {
    finish(error, { early: true, notifyReader: true });
  }

  const onMessage = (event: MessageEventLike<unknown>) => {
    if (finished) return;
    const message = parseMessage(event.data);
    if (message === undefined) {
      fail(new RpcError("stream-protocol-error", "Worker stream received an invalid control message."));
      return;
    }
    switch (message.type) {
      case "claim":
        if (claimed) {
          fail(new RpcError("stream-protocol-error", "Worker stream port was claimed more than once."));
          return;
        }
        claimed = true;
        cancelClaimDeadline();
        return;
      case "pull":
        if (!claimed || pullPending) {
          fail(new RpcError("stream-protocol-error", "Worker stream received an unexpected pull."));
          return;
        }
        pullPending = true;
        void produceOne();
        return;
      case "cancel":
        finish(
          message.error === undefined
            ? new RpcError("aborted", "Worker stream reader cancelled the stream.")
            : deserialiseRpcError(message.error),
          { early: true, notifyReader: false },
        );
        return;
      default:
        fail(new RpcError("stream-protocol-error", "Worker stream received a response message."));
    }
  };

  async function produceOne(): Promise<void> {
    try {
      if (iterator === undefined) {
        const source = createSource(sourceController.signal);
        if (source === null || typeof source?.[Symbol.asyncIterator] !== "function") {
          throw new RpcError("stream-protocol-error", "Worker stream source is not async iterable.");
        }
        iterator = source[Symbol.asyncIterator]();
        if (typeof iterator?.next !== "function") {
          throw new RpcError("stream-protocol-error", "Worker stream source returned an invalid iterator.");
        }
        if (finished) {
          returnSource();
          return;
        }
      }

      const result = await iterator.next();
      if (finished) return;
      if (
        typeof result !== "object" ||
        result === null ||
        (result.done !== undefined && typeof result.done !== "boolean")
      ) {
        throw new RpcError("stream-protocol-error", "Worker stream source returned an invalid iterator result.");
      }
      if (result.done === true) {
        pullPending = false;
        try {
          send(producerPort, { version: 1, type: "end" });
        } catch (error) {
          throw asRpcError(error, "send-failed", "Could not finish the Worker stream.");
        }
        finish(undefined, { early: false, notifyReader: false });
        return;
      }

      const chunk = validateChunk(result.value, maxChunkBytes);
      const transfer = prepareChunkTransfer(chunk, transferChunks);
      try {
        send(producerPort, { version: 1, type: "chunk", value: chunk }, transfer);
      } catch (error) {
        throw asRpcError(error, "send-failed", "Could not send a Worker stream chunk.");
      }
      pullPending = false;
    } catch (error) {
      if (!finished) fail(asRpcError(error, "remote-error", "Worker stream source failed."));
    }
  }

  try {
    producerPort.addEventListener("message", onMessage);
    producerPort.start();
    if (signal !== undefined) {
      const onAbort = () => fail(cancellationError(signal.reason, "Worker stream connection ended."));
      removeSignalListener = () => signal.removeEventListener("abort", onAbort);
      signal.addEventListener("abort", onAbort, { once: true });
      if (signal.aborted) {
        throw cancellationError(signal.reason, "Worker stream connection ended.");
      }
    }
    if (!finished) {
      const cancel = scheduler.setTimeout(() => {
        finish(new RpcError("timeout", "Worker stream was not claimed before its deadline."), {
          early: true,
          notifyReader: true,
        });
      }, claimTimeoutMs);
      cancelClaimTimer = cancel;
      if (finished) {
        cancelClaimDeadline();
      }
    }
  } catch (error) {
    const failure = asRpcError(error, "internal-error", "Could not initialise the Worker stream.");
    finish(failure, { early: true, notifyReader: false });
    throw failure;
  }

  return withTransfer<WorkerStreamPort, WorkerTransferPort>(readerPort, [readerPort]);
}

/**
 * Opens and immediately claims the receiving side of a dedicated Worker stream
 * port. Each `next()` reserves the maximum chunk charge before sending a pull.
 * Concurrent reads reject without disturbing the active read; `return()` sends
 * cancellation, abandons any pending read, and closes the receiving port.
 *
 * @param options - Receiving port, chunk limit, cancellation, and optional shared budget.
 */
export function readWorkerStream(
  options: ReadWorkerStreamOptions,
): AsyncIterableIterator<WorkerStreamChunk> {
  const { port, maxChunkBytes, signal } = options;
  validateChunkLimit(maxChunkBytes);
  if (!isWorkerStreamPort(port)) {
    throw new RpcError("invalid-contract", "Worker stream requires a message port.");
  }
  const budget = options.budget ?? createWorkerStreamBudget(maxChunkBytes);
  if (budget.maxBytes < maxChunkBytes) {
    throw new RpcError("invalid-contract", "Worker stream chunk limit exceeds its receiving byte budget.");
  }

  const readController = createCancelController();
  let finished = false;
  let portClosed = false;
  let terminalError: RpcError | undefined;
  let readPending = false;
  let delivery: ReturnType<typeof promiseWithResolvers<IteratorResult<WorkerStreamChunk>>> | undefined;
  let releaseReservation: (() => void) | undefined;
  let removeSignalListener: (() => void) | undefined;

  function close(): void {
    if (portClosed) return;
    portClosed = true;
    try {
      void Promise.resolve(port.close()).catch(() => undefined);
    } catch {
      // The terminal state remains effective after a detached-port error.
    }
  }

  function removeListeners(): void {
    try {
      port.removeEventListener("message", onMessage);
    } catch {
      // Reservation release and port close still need to run.
    }
    try {
      removeSignalListener?.();
    } catch {
      // Cleanup continues if the supplied cancellation source rejects removal.
    }
    removeSignalListener = undefined;
  }

  function finish(error: RpcError | undefined, notifyProducer: boolean, resolvePending = false): void {
    if (finished) return;
    finished = true;
    terminalError = error;
    removeListeners();
    readController.abort(error);
    const release = releaseReservation;
    releaseReservation = undefined;
    release?.();
    const currentDelivery = delivery;
    delivery = undefined;
    if (currentDelivery !== undefined) {
      if (resolvePending) {
        currentDelivery.resolve({ done: true, value: undefined });
      } else {
        currentDelivery.reject(error ?? new RpcError("aborted", "Worker stream read was cancelled."));
      }
    }
    if (notifyProducer) {
      try {
        send(port, {
          version: 1,
          type: "cancel",
          ...(error !== undefined ? { error: serialiseRpcError(error) } : {}),
        });
      } catch {
        // If delivery fails, the producer remains bound to its Worker lifetime.
      }
    }
    close();
  }

  function fail(error: RpcError, notifyProducer = true): void {
    finish(error, notifyProducer);
  }

  const onMessage = (event: MessageEventLike<unknown>) => {
    if (finished) return;
    const message = parseMessage(event.data);
    if (message === undefined) {
      fail(new RpcError("stream-protocol-error", "Worker stream received an invalid response message."));
      return;
    }
    switch (message.type) {
      case "chunk": {
        if (delivery === undefined) {
          fail(new RpcError("stream-protocol-error", "Worker stream sent a chunk without a pending pull."));
          return;
        }
        let chunk: WorkerStreamChunk;
        try {
          chunk = validateChunk(message.value, maxChunkBytes);
        } catch (error) {
          fail(asRpcError(error, "stream-protocol-error", "Worker stream sent an invalid chunk."));
          return;
        }
        const currentDelivery = delivery;
        delivery = undefined;
        const release = releaseReservation;
        releaseReservation = undefined;
        release?.();
        currentDelivery.resolve({ done: false, value: chunk });
        return;
      }
      case "end": {
        if (delivery === undefined) {
          fail(new RpcError("stream-protocol-error", "Worker stream ended without a pending pull."));
          return;
        }
        finish(undefined, false, true);
        return;
      }
      case "error":
        fail(deserialiseRpcError(message.error), false);
        return;
      default:
        fail(new RpcError("stream-protocol-error", "Worker stream received a request message."));
    }
  };

  try {
    port.addEventListener("message", onMessage);
    port.start();
    if (signal !== undefined) {
      const onAbort = () => fail(cancellationError(signal.reason, "Worker stream connection ended."));
      removeSignalListener = () => signal.removeEventListener("abort", onAbort);
      signal.addEventListener("abort", onAbort, { once: true });
      if (signal.aborted) {
        onAbort();
      }
    }
    if (!finished) send(port, { version: 1, type: "claim" });
  } catch (error) {
    const failure = asRpcError(error, "internal-error", "Could not open the Worker stream port.");
    removeListeners();
    close();
    throw failure;
  }

  return {
    [Symbol.asyncIterator](): AsyncIterableIterator<WorkerStreamChunk> {
      return this;
    },
    async next(): Promise<IteratorResult<WorkerStreamChunk>> {
      if (finished) {
        if (terminalError !== undefined) throw terminalError;
        return { done: true, value: undefined };
      }
      if (readPending) {
        throw new RpcError("stream-protocol-error", "Only one Worker stream read may be outstanding.");
      }
      readPending = true;
      try {
        const release = await reserveWorkerStreamBudget(
          budget,
          maxChunkBytes,
          readController.signal,
        );
        if (finished) {
          release();
          if (terminalError !== undefined) throw terminalError;
          return { done: true, value: undefined };
        }
        releaseReservation = release;
        const currentDelivery = promiseWithResolvers<IteratorResult<WorkerStreamChunk>>();
        delivery = currentDelivery;
        try {
          send(port, { version: 1, type: "pull" });
        } catch (error) {
          fail(asRpcError(error, "send-failed", "Could not request a Worker stream chunk."));
        }
        return await currentDelivery.promise;
      } catch (error) {
        if (finished && terminalError !== undefined) throw terminalError;
        if (finished) return { done: true, value: undefined };
        const failure = asRpcError(error, "internal-error", "Worker stream read failed.");
        fail(failure);
        throw failure;
      } finally {
        readPending = false;
      }
    },
    async return(): Promise<IteratorResult<WorkerStreamChunk>> {
      finish(undefined, true, true);
      return { done: true, value: undefined };
    },
  };
}

function prepareChunkTransfer(
  chunk: WorkerStreamChunk,
  transferChunks: boolean,
): ArrayBuffer[] {
  if (!transferChunks || typeof chunk === "string") {
    return [];
  }
  const buffer = chunk.buffer;
  if (chunk.byteOffset !== 0 || chunk.byteLength !== buffer.byteLength) {
    throw new RpcError(
      "invalid-contract",
      "Transferred Worker stream chunks must exclusively cover their complete backing buffer.",
    );
  }
  return [buffer];
}

function validateChunk(value: unknown, maxChunkBytes: number): WorkerStreamChunk {
  if (typeof value === "string") {
    if (value.length * 2 > maxChunkBytes) {
      throw new RpcError("stream-protocol-error", "Worker stream chunk exceeded maxChunkBytes.");
    }
    return value;
  }
  if (!(value instanceof Uint8Array) || !(value.buffer instanceof ArrayBuffer)) {
    throw new RpcError("stream-protocol-error", "Worker stream chunk must be a string or Uint8Array.");
  }
  const bytes = value as Uint8Array<ArrayBuffer>;
  if (bytes.buffer.byteLength > maxChunkBytes) {
    throw new RpcError("stream-protocol-error", "Worker stream chunk exceeded maxChunkBytes.");
  }
  return bytes;
}

function parseMessage(candidate: unknown): StreamMessage | undefined {
  if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) return undefined;
  const message = candidate as Record<string, unknown>;
  if (message.version !== 1 || typeof message.type !== "string") return undefined;
  switch (message.type) {
    case "claim":
    case "pull":
    case "end":
      return { version: 1, type: message.type };
    case "chunk":
      return "value" in message
        ? { version: 1, type: "chunk", value: message.value }
        : undefined;
    case "error":
      return isValidSerializedError(message.error)
        ? { version: 1, type: "error", error: message.error }
        : undefined;
    case "cancel":
      return message.error === undefined || isValidSerializedError(message.error)
        ? {
            version: 1,
            type: "cancel",
            ...(message.error !== undefined ? { error: message.error } : {}),
          }
        : undefined;
    default:
      return undefined;
  }
}

function deserialiseRpcError(error: StreamError): RpcError {
  return new RpcError(error.code as RpcErrorCode, error.message, {
    ...(error.remoteName !== undefined ? { remoteName: error.remoteName } : {}),
  });
}

function cancellationError(reason: unknown, fallback: string): RpcError {
  if (reason instanceof RpcError) return reason;
  return new RpcError(
    "aborted",
    reason instanceof Error && reason.message.length > 0 ? reason.message : fallback,
    reason !== undefined ? { cause: reason } : {},
  );
}

function asRpcError(error: unknown, code: RpcErrorCode, fallback: string): RpcError {
  if (error instanceof RpcError) return error;
  return new RpcError(
    code,
    error instanceof Error && error.message.length > 0 ? error.message : fallback,
    error !== undefined ? { cause: error } : {},
  );
}

function validateChunkLimit(maxChunkBytes: number): void {
  if (!Number.isSafeInteger(maxChunkBytes) || maxChunkBytes < 0) {
    throw new RpcError("invalid-contract", "Worker stream maxChunkBytes must be a non-negative safe integer.");
  }
}

function isWorkerStreamPort(candidate: unknown): candidate is WorkerStreamPort {
  if (typeof candidate !== "object" || candidate === null) return false;
  const port = candidate as Record<string, unknown>;
  return (
    typeof port.postMessage === "function" &&
    typeof port.addEventListener === "function" &&
    typeof port.removeEventListener === "function" &&
    typeof port.start === "function" &&
    typeof port.close === "function"
  );
}

function closeUnknownPort(candidate: unknown): void {
  if (typeof candidate !== "object" || candidate === null) return;
  const close = (candidate as { close?: unknown }).close;
  if (typeof close !== "function") return;
  try {
    void Promise.resolve(close.call(candidate)).catch(() => undefined);
  } catch {
    // An invalid channel factory still releases whichever endpoint it supplied.
  }
}

function send(
  port: WorkerStreamPort,
  message: StreamMessage,
  transfer: never[] | ArrayBuffer[] = [],
): void {
  port.postMessage(message, transfer as never[]);
}
