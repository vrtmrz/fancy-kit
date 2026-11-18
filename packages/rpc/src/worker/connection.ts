import { promiseWithResolvers } from "octagonal-wheels/promises";
import { createCancelController } from "../cancelSignal.js";
import type { ContractShape } from "../contracts.js";
import { createRpcEndpoint } from "../endpoint.js";
import { isValidSerializedError, toRpcError } from "../endpoint/envelopes.js";
import { serialiseRpcError, type RpcSerializedError } from "../errors.js";
import { RpcError } from "../RpcError.js";
import { createDefaultScheduler } from "../scheduler.js";
import type {
  Awaitable,
  CancelSignal,
  PeerAddress,
  RpcDiagnosticEvent,
  RpcEndpoint,
  RpcEnvelope,
  RpcPeerClient,
  RpcScheduler,
  ValidateEndpointCapabilities,
} from "../types.js";
import { createIdentityCodec, createMessagePortTransport } from "../worker.transport.js";
import type {
  MessageEventLike,
  MessagePortLike,
  WorkerPostOptions,
  WorkerTransferResource,
} from "../worker.types.js";

const hostPeer: PeerAddress = { peerId: "host", instanceId: "worker-rpc" };
const workerPeer: PeerAddress = { peerId: "worker", instanceId: "worker-rpc" };
const defaultStartupTimeoutMs = 10_000;
const readyFrame = { kind: "worker-rpc-ready", version: 1 } as const;

type ControlFrame = typeof readyFrame | {
  readonly kind: "worker-rpc-closed";
  readonly version: 1;
  readonly error: RpcSerializedError;
};

type ErrorListener = (event: { readonly message?: string; readonly error?: unknown }) => void;
type MessageListener = (event: MessageEventLike) => void;
type Resource = WorkerTransferResource<"binary-data-and-ports">;
type Endpoint<C extends ContractShape> = RpcEndpoint<C, WorkerPostOptions, Resource>;
type Diagnostics = (event: RpcDiagnosticEvent) => void;

/** Dedicated Worker capabilities needed by the managed host connection. */
export interface WorkerRpcWorker extends MessagePortLike<never> {
  addEventListener(type: "message", listener: MessageListener): void;
  addEventListener(type: "error", listener: ErrorListener): void;
  addEventListener(type: "messageerror", listener: () => void): void;
  removeEventListener(type: "message", listener: MessageListener): void;
  removeEventListener(type: "error", listener: ErrorListener): void;
  removeEventListener(type: "messageerror", listener: () => void): void;
  /** Stops the owned Worker. Runtime adapters may return a teardown promise. */
  terminate(): void | Promise<unknown>;
}

/** Typed client for one managed Worker, with binary and port transfer. */
export type WorkerRpcClient<C extends ContractShape> = RpcPeerClient<C, WorkerPostOptions, Resource>;

interface WorkerRpcOptions<C extends ContractShape> {
  /** Shared unary and notification contract. */
  readonly contract: C;
  /** Optional timer facility for RPC deadlines and host startup. */
  readonly scheduler?: RpcScheduler;
  /** Observer for RPC and Worker transport failures. */
  readonly onDiagnostic?: Diagnostics;
}

/** Host-side configuration for creating one managed Worker. */
export interface ConnectWorkerRpcOptions<C extends ContractShape> extends WorkerRpcOptions<C> {
  /** Creates a fresh Worker and gives ownership to the connection. */
  readonly createWorker: () => WorkerRpcWorker;
  /** Time allowed for handler registration and the readiness message. Defaults to 10 seconds. */
  readonly startupTimeoutMs?: number;
}

/** Owned host connection whose client becomes available after Worker registration. */
export interface WorkerRpcConnection<C extends ContractShape> {
  /** Resolves with the client when the Worker is ready, or rejects on startup failure. */
  readonly ready: Promise<WorkerRpcClient<C>>;
  /** Aborts with the first terminal reason, including after successful startup. */
  readonly signal: CancelSignal;
  /** Rejects active waits and starts Worker termination once. */
  close(reason?: RpcError): void;
}

/** Worker-side configuration for registering application handlers. */
export interface ServeWorkerRpcOptions<C extends ContractShape> extends WorkerRpcOptions<C> {
  /** Borrowed message endpoint, normally the dedicated Worker global scope. */
  readonly port: MessagePortLike<never>;
  /** Registers handlers before advertising readiness. The signal owns Worker-side resources. */
  readonly register: (endpoint: Pick<Endpoint<C>, "handle">, signal: CancelSignal) => Awaitable<void>;
}

/** Worker-side handler registration and lifetime. */
export interface WorkerRpcServer {
  /** Resolves after registration and the readiness message have been sent. */
  readonly ready: Promise<void>;
  /** Aborts when the server is explicitly closed or registration fails. */
  readonly signal: CancelSignal;
  /** Releases RPC resources and reports the terminal reason to the host. */
  close(reason?: RpcError): void;
}

function readControlFrame(raw: unknown): ControlFrame | undefined {
  if (typeof raw !== "object" || raw === null) {
    return;
  }
  const frame = raw as Record<string, unknown>;
  if (frame.version !== 1) {
    return;
  }
  if (frame.kind === readyFrame.kind) {
    return readyFrame;
  }
  if (frame.kind === "worker-rpc-closed" && isValidSerializedError(frame.error)) {
    return { kind: frame.kind, version: 1, error: frame.error };
  }
}

function createWorkerEndpoint<C extends ContractShape>(
  options: WorkerRpcOptions<C> & ValidateEndpointCapabilities<C, true, never>,
  port: MessagePortLike<never>,
  localPeer: PeerAddress,
  remotePeer: PeerAddress,
  onControl?: (frame: ControlFrame) => void,
): Endpoint<C> {
  const transport = createMessagePortTransport({ port, remotePeer, transferProfile: "binary-data-and-ports" });
  return createRpcEndpoint<C, unknown, WorkerPostOptions, Resource, true>({
    ...options,
    codec: createIdentityCodec<RpcEnvelope>(),
    localPeer,
    transportOwnership: "owned",
    transport: {
      ...transport,
      subscribe(handler) {
        return transport.subscribe((from, payload) => {
          const frame = readControlFrame(payload);
          if (frame) {
            onControl?.(frame);
          } else {
            handler(from, payload);
          }
        });
      },
    },
  });
}

function cleanUp(action: () => unknown, diagnostic?: Diagnostics): void {
  const report = (error: unknown) => {
    void Promise.resolve().then(() => diagnostic?.({
      type: "transport-close-failed",
      operation: "transport-close",
      error: toRpcError("internal-error", error),
    })).catch(() => undefined);
  };
  try {
    void Promise.resolve(action()).catch(report);
  } catch (error) {
    report(error);
  }
}

/** Creates a worker, waits for its registration message, and owns its lifetime. */
export function connectWorkerRpc<const C extends ContractShape>(
  options: ConnectWorkerRpcOptions<C> & ValidateEndpointCapabilities<C, true, never>,
): WorkerRpcConnection<C> {
  const { onDiagnostic, scheduler = createDefaultScheduler(), startupTimeoutMs = defaultStartupTimeoutMs } = options;
  if (!Number.isFinite(startupTimeoutMs) || startupTimeoutMs <= 0) {
    throw new RangeError("Worker startupTimeoutMs must be positive and finite.");
  }
  const worker = options.createWorker();
  const controller = createCancelController();
  const ready = promiseWithResolvers<WorkerRpcClient<C>>();
  void ready.promise.catch(() => undefined);
  let endpoint: Endpoint<C> | undefined;
  let receivedReady = false;
  let stopTimeout: (() => void) | undefined;
  let closeReason: RpcError | undefined;

  function clearStartupTimer(): void {
    const stop = stopTimeout;
    stopTimeout = undefined;
    if (stop) {
      cleanUp(stop, onDiagnostic);
    }
  }

  function close(reason = new RpcError("disconnected", "Worker RPC connection closed.")): void {
    if (closeReason) {
      return;
    }
    closeReason = reason;
    clearStartupTimer();
    cleanUp(() => worker.removeEventListener("error", onError), onDiagnostic);
    cleanUp(() => worker.removeEventListener("messageerror", onMessageError), onDiagnostic);
    endpoint?.close(reason);
    ready.reject(reason);
    controller.abort(reason);
    cleanUp(() => worker.terminate(), onDiagnostic);
  }

  function onError(event: Parameters<ErrorListener>[0]): void {
    close(new RpcError("disconnected", event.message || "Worker RPC failed.", { cause: event.error }));
  }

  function onMessageError(): void {
    close(new RpcError("decode-failed", "Worker RPC received a message that could not be decoded."));
  }

  function onControl(frame: ControlFrame): void {
    if (frame.kind === "worker-rpc-closed") {
      const { code, message, remoteName } = frame.error;
      close(new RpcError(code, message, remoteName === undefined ? undefined : { remoteName }));
    } else if (!receivedReady && !closeReason) {
      receivedReady = true;
      clearStartupTimer();
      if (endpoint) {
        ready.resolve(endpoint.bindPeer(workerPeer));
      }
    }
  }

  try {
    worker.addEventListener("error", onError);
    worker.addEventListener("messageerror", onMessageError);
    endpoint = createWorkerEndpoint(options, worker, hostPeer, workerPeer, onControl);
    if (closeReason) {
      endpoint.close(closeReason);
    } else if (receivedReady) {
      ready.resolve(endpoint.bindPeer(workerPeer));
    } else {
      stopTimeout = scheduler.setTimeout(() => {
        if (!receivedReady) {
          close(new RpcError("timeout", "Worker RPC startup timed out."));
        }
      }, startupTimeoutMs);
      if (receivedReady || closeReason) {
        clearStartupTimer();
      }
    }
  } catch (error) {
    close(toRpcError("disconnected", error));
  }
  return { ready: ready.promise, signal: controller.signal, close };
}

/** Registers the Worker handlers and announces readiness on the dedicated control port. */
export function serveWorkerRpc<const C extends ContractShape>(
  options: ServeWorkerRpcOptions<C> & ValidateEndpointCapabilities<C, true, never>,
): WorkerRpcServer {
  const controller = createCancelController();
  const ready = promiseWithResolvers<void>();
  void ready.promise.catch(() => undefined);
  let endpoint: Endpoint<C> | undefined;

  function close(reason = new RpcError("disconnected", "Worker RPC server closed.")): void {
    if (controller.signal.aborted) {
      return;
    }
    controller.abort(reason);
    endpoint?.close(reason);
    ready.reject(reason);
    const frame: ControlFrame = { kind: "worker-rpc-closed", version: 1, error: serialiseRpcError(reason) };
    cleanUp(() => options.port.postMessage(frame, []), options.onDiagnostic);
  }

  try {
    const active = createWorkerEndpoint(options, options.port, workerPeer, hostPeer);
    endpoint = active;
    const registration = options.register({
      handle(method, handler) {
        if (controller.signal.aborted) {
          throw controller.signal.reason;
        }
        return active.handle(method, handler);
      },
    }, controller.signal);
    void Promise.resolve(registration).then(() => {
      if (!controller.signal.aborted) {
        options.port.postMessage(readyFrame, []);
        ready.resolve();
      }
    }).catch((error: unknown) => close(toRpcError("remote-error", error)));
  } catch (error) {
    close(toRpcError("remote-error", error));
  }
  return { ready: ready.promise, signal: controller.signal, close };
}
