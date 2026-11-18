import type { CancellationSignal } from "../service/contracts.js";
import { RpcError, asRpcErrorShape } from "./RpcError.js";
import {
  RPC_VERSION_MAJOR,
  RPC_VERSION_MINOR,
  type JsonLike,
  type RpcAbortController,
  type RpcEnvelope,
  type RpcErrorShape,
  type RpcRequestContext,
  type RpcRequestEnvelope,
} from "./types.js";

interface Operation<S extends CancellationSignal> extends RpcRequestContext<S> {
  peerId: string;
  controller: RpcAbortController<S>;
}
/** Internal registered operation, with one queue per method registration. */
export interface RegisteredMethod<S extends CancellationSignal> {
  invoke(
    context: RpcRequestContext<S>,
    peerId: string,
    args: JsonLike[],
  ): unknown;
  serial: boolean;
  queue: Promise<void>;
}
interface Dependencies<S extends CancellationSignal> {
  createAbortController(): RpcAbortController<S>;
  canAcceptRequest:
    | ((
        peerId: string,
        method: string,
        context: RpcRequestContext<S>,
      ) => boolean | Promise<boolean>)
    | undefined;
  sendEnvelope(peerId: string, envelope: RpcEnvelope): Promise<void>;
  warn(message: string, peerId: string): void;
}
interface State<S extends CancellationSignal> {
  closed: boolean;
  operations: Map<string, Operation<S>>;
  methods: Map<string, RegisteredMethod<S>>;
  versions: Map<string, { major: number; minor: number }>;
}
function operationKey(peerId: string, requestId: string): string {
  return JSON.stringify([peerId, requestId]);
}
function retire<S extends CancellationSignal>(
  state: State<S>,
  requestId: string,
  op: Operation<S>,
): void {
  const key = operationKey(op.peerId, requestId);
  if (state.operations.get(key) === op) {
    state.operations.delete(key);
  }
}
async function reportFailure<S extends CancellationSignal>(
  deps: Pick<Dependencies<S>, "sendEnvelope" | "warn">,
  peerId: string,
  envelope: RpcRequestEnvelope,
  error: RpcErrorShape,
): Promise<void> {
  if (envelope.expectsResponse === false) {
    deps.warn(`RPC notification ${envelope.method}: ${error.message}`, peerId);
  } else {
    await deps.sendEnvelope(peerId, {
      kind: "response",
      requestId: envelope.requestId,
      ok: false,
      error,
    });
  }
}
async function reportResponseSendFailure<S extends CancellationSignal>(
  state: State<S>,
  deps: Pick<Dependencies<S>, "sendEnvelope" | "warn">,
  peerId: string,
  envelope: RpcRequestEnvelope,
  op: Operation<S>,
  error: unknown,
): Promise<void> {
  const failure = asRpcErrorShape(error);
  const contextualFailure: RpcErrorShape = {
    ...failure,
    message:
      `RPC method ${envelope.method} completed successfully, but sending its ` +
      `success response failed: ${failure.message}`,
  };
  deps.warn(`${contextualFailure.message} (request ${envelope.requestId})`, peerId);
  if (
    op.signal.aborted ||
    state.closed ||
    state.operations.get(operationKey(peerId, envelope.requestId)) !== op
  ) {
    return;
  }
  try {
    await reportFailure(deps, peerId, envelope, contextualFailure);
  } catch (deliveryError) {
    const deliveryFailure = asRpcErrorShape(deliveryError);
    deps.warn(
      `RPC method ${envelope.method} completed successfully, but sending its ` +
        `fallback error response also failed (request ${envelope.requestId}): ` +
        deliveryFailure.message,
      peerId,
    );
  }
}
async function runMethod<S extends CancellationSignal>(
  state: State<S>,
  deps: Dependencies<S>,
  method: RegisteredMethod<S>,
  envelope: RpcRequestEnvelope,
  peerId: string,
  op: Operation<S>,
): Promise<void> {
  let data: unknown;
  try {
    if (op.signal.aborted || state.closed) {
      return;
    }
    data = await method.invoke(op, peerId, envelope.args);
  } catch (error) {
    if (!op.signal.aborted && !state.closed) {
      try {
        await reportFailure(deps, peerId, envelope, asRpcErrorShape(error));
      } catch (deliveryError) {
        const deliveryFailure = asRpcErrorShape(deliveryError);
        deps.warn(
          `RPC method ${envelope.method} failed, and sending its error response ` +
            `also failed (request ${envelope.requestId}): ` +
            deliveryFailure.message,
          peerId,
        );
      }
    }
    return;
  }
  if (
    op.signal.aborted ||
    state.closed ||
    envelope.expectsResponse === false
  ) {
    return;
  }
  try {
    await deps.sendEnvelope(peerId, {
      kind: "response",
      requestId: envelope.requestId,
      ok: true,
      data: data as JsonLike,
    });
  } catch (error) {
    if (!op.signal.aborted && !state.closed) {
      await reportResponseSendFailure(
        state,
        deps,
        peerId,
        envelope,
        op,
        error,
      );
    }
  }
}
async function handleRequest<S extends CancellationSignal>(
  state: State<S>,
  deps: Dependencies<S>,
  envelope: RpcRequestEnvelope,
  peerId: string,
): Promise<void> {
  if (state.closed) {
    return;
  }
  const controller = deps.createAbortController();
  const op: Operation<S> = { peerId, controller, signal: controller.signal };
  state.operations.set(operationKey(peerId, envelope.requestId), op);
  try {
    const accepted = await deps.canAcceptRequest?.(peerId, envelope.method, op);
    if (accepted === false || op.signal.aborted || state.closed) {
      return;
    }
    const version = state.versions.get(peerId);
    if (version && version.major !== RPC_VERSION_MAJOR) {
      await reportFailure(deps, peerId, envelope, {
        code: "REMOTE_ERROR",
        message: `RPC major mismatch: local=${RPC_VERSION_MAJOR}, remote=${version.major}`,
      });
      return;
    }
    if (version && version.minor !== RPC_VERSION_MINOR) {
      deps.warn(
        `RPC minor mismatch: local=${RPC_VERSION_MINOR}, remote=${version.minor}`,
        peerId,
      );
    }
    const method = state.methods.get(envelope.method);
    if (!method) {
      await reportFailure(deps, peerId, envelope, {
        code: "REMOTE_ERROR",
        message: `Method not found: ${envelope.method}`,
      });
      return;
    }
    const runner = () => runMethod(state, deps, method, envelope, peerId, op);
    if (method.serial) {
      method.queue = method.queue.then(runner, runner);
      await method.queue;
    } else {
      await runner();
    }
  } catch (error) {
    if (!op.signal.aborted && !state.closed) {
      await reportFailure(deps, peerId, envelope, asRpcErrorShape(error));
    }
  } finally {
    retire(state, envelope.requestId, op);
  }
}
function abortOperation<S extends CancellationSignal>(op: Operation<S>): void {
  if (!op.signal.aborted) {
    op.controller.abort(new RpcError("CANCELLED", "Invocation cancelled"));
  }
}
/** Owns inbound execution, admission, serial queues, and cancellation. */
export function createInboundCalls<S extends CancellationSignal>(
  deps: Dependencies<S>,
) {
  const state: State<S> = {
    closed: false,
    operations: new Map(),
    methods: new Map(),
    versions: new Map(),
  };
  return {
    register(method: string, handler: RegisteredMethod<S>): void {
      state.methods.set(method, handler);
    },
    receiveRequest: (envelope: RpcRequestEnvelope, peerId: string) =>
      handleRequest(state, deps, envelope, peerId),
    receiveHandshake(peerId: string, major: number, minor: number): void {
      state.versions.set(peerId, { major, minor });
      if (major !== RPC_VERSION_MAJOR) {
        deps.warn(
          `RPC major mismatch: local=${RPC_VERSION_MAJOR}, remote=${major}`,
          peerId,
        );
      }
    },
    cancel(peerId: string, requestId: string): void {
      const op = state.operations.get(operationKey(peerId, requestId));
      if (op?.peerId === peerId) {
        abortOperation(op);
      }
    },
    peerLeft(peerId: string): void {
      for (const [id, op] of state.operations) {
        if (op.peerId === peerId) {
          abortOperation(op);
          state.operations.delete(id);
        }
      }
      state.versions.delete(peerId);
    },
    close(): void {
      state.closed = true;
      for (const op of state.operations.values()) {
        abortOperation(op);
      }
      state.operations.clear();
      state.methods.clear();
      state.versions.clear();
    },
  };
}
