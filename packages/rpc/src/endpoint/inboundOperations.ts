import { invokeHandler } from "./inboundOperations.invokeHandler.js";
import { RpcError } from "../RpcError.js";
import {
  createCancelController,
  type CancelController,
} from "../cancelSignal.js";
import type { RpcMethodDescriptor } from "../contracts.js";
import type {
  PeerAddress,
  RpcDiagnosticEvent,
  RpcEnvelope,
  RpcInvocationContext,
} from "../types.js";
import { peerAddressKey } from "./envelopes.js";
import type { EndpointSender } from "./sending.js";

interface InboundRequestOperation {
  readonly opId: number;
  readonly correlationKey: string;
  readonly peer: PeerAddress;
  readonly peerKey: string;
  readonly requestId: string;
  readonly controller: CancelController;
  cancelled: boolean;
  finished: boolean;
}

interface InboundNotifyOperation {
  readonly opId: number;
  readonly peer: PeerAddress;
  readonly peerKey: string;
  readonly controller: CancelController;
  finished: boolean;
}

/** Internal callable signature for registered inbound RPC handlers. */
export type InboundOperationHandler = (
  ctx: RpcInvocationContext,
  ...args: never[]
) => unknown;

/** Response-sending capability required by the inbound operation owner. */
export type InboundResponseSender = Pick<
  EndpointSender<unknown, unknown, unknown>,
  "sendSuccessResponse" | "sendErrorResponse"
>;

/** Dependencies required by the inbound operation owner. */
export interface InboundOperationRegistryOptions {
  readonly getDescriptor: (method: string) => RpcMethodDescriptor | undefined;
  readonly getHandler: (method: string) => InboundOperationHandler | undefined;
  readonly sender: InboundResponseSender;
  readonly emitDiagnostic: (event: RpcDiagnosticEvent) => void;
  readonly isEndpointClosed: () => boolean;
}

/** Owner for inbound request and notification execution, cancellation, and retirement. */
export interface InboundOperationRegistry {
  /** Dispatches an inbound unary request envelope and owns its cancellation context. */
  handleRequest(
    from: PeerAddress,
    envelope: Extract<RpcEnvelope, { kind: "request" }>,
  ): void;
  /** Dispatches an inbound notification envelope and tracks it until completion or shutdown. */
  handleNotify(
    from: PeerAddress,
    envelope: Extract<RpcEnvelope, { kind: "notify" }>,
  ): void;
  /** Cancels all active request operations matching `(from, envelope.requestId)`. */
  handleCancel(
    from: PeerAddress,
    envelope: Extract<RpcEnvelope, { kind: "cancel" }>,
  ): void;
  /** Aborts all active request and notification operations from a retired remote peer. */
  retirePeer(peerKey: string, disconnectError: RpcError): void;
  /** Aborts all active inbound operations during endpoint shutdown. */
  closeAll(closeError: RpcError): void;
}

/** Creates the inbound operation owner for an RPC endpoint. */
export function createInboundOperationRegistry(
  options: InboundOperationRegistryOptions,
): InboundOperationRegistry {
  const {
    getDescriptor,
    getHandler,
    sender,
    emitDiagnostic,
    isEndpointClosed,
  } = options;

  let nextOpId = 1;
  const requestOpsByCorrelation = new Map<
    string,
    Set<InboundRequestOperation>
  >();
  const notifyOps = new Set<InboundNotifyOperation>();

  function retireRequestOp(op: InboundRequestOperation): void {
    const bucket = requestOpsByCorrelation.get(op.correlationKey);
    if (!bucket) return;
    bucket.delete(op);
    if (bucket.size === 0) {
      requestOpsByCorrelation.delete(op.correlationKey);
    }
  }

  function handleRequest(
    from: PeerAddress,
    envelope: Extract<RpcEnvelope, { kind: "request" }>,
  ): void {
    const descriptor = getDescriptor(envelope.method);
    if (!descriptor) {
      sender.sendErrorResponse(
        from,
        envelope.requestId,
        new RpcError(
          "method-not-found",
          `Method "${envelope.method}" is not in the contract.`,
          {
            peer: from,
          },
        ),
      );
      return;
    }
    if (descriptor.kind === "notify") {
      sender.sendErrorResponse(
        from,
        envelope.requestId,
        new RpcError(
          "invalid-contract",
          `Method "${envelope.method}" is notification-only and rejects calls.`,
          { peer: from },
        ),
      );
      return;
    }
    if (descriptor.kind !== "call") {
      sender.sendErrorResponse(
        from,
        envelope.requestId,
        new RpcError(
          "invalid-contract",
          `Method "${envelope.method}" cannot be invoked as a unary call.`,
          { peer: from },
        ),
      );
      return;
    }

    const handler = getHandler(envelope.method);
    if (!handler) {
      sender.sendErrorResponse(
        from,
        envelope.requestId,
        new RpcError(
          "method-not-found",
          `No handler registered for "${envelope.method}".`,
          {
            peer: from,
          },
        ),
      );
      return;
    }

    const peerKey = peerAddressKey(from);
    const correlationKey = `${peerKey}\0${envelope.requestId}`;
    const controller = createCancelController();
    const op: InboundRequestOperation = {
      opId: nextOpId++,
      correlationKey,
      peer: from,
      peerKey,
      requestId: envelope.requestId,
      controller,
      cancelled: false,
      finished: false,
    };

    let bucket = requestOpsByCorrelation.get(correlationKey);
    if (!bucket) {
      bucket = new Set<InboundRequestOperation>();
      requestOpsByCorrelation.set(correlationKey, bucket);
    }
    // Preserve every active delivery's cancellation ownership without replacing older entries.
    bucket.add(op);

    const ctx: RpcInvocationContext = {
      peer: from,
      signal: controller.signal,
      isNotification: false,
    };

    const completeSuccess = (result: unknown) => {
      retireRequestOp(op);
      if (!isEndpointClosed() && !op.cancelled && !op.finished) {
        op.finished = true;
        sender.sendSuccessResponse(
          from,
          envelope.requestId,
          descriptor,
          result,
        );
      }
      controller.clear();
    };

    const completeFailure = (error: unknown) => {
      retireRequestOp(op);
      emitDiagnostic({
        type: "handler-error",
        method: envelope.method,
        peer: from,
        error,
      });
      if (!isEndpointClosed() && !op.cancelled && !op.finished) {
        op.finished = true;
        sender.sendErrorResponse(from, envelope.requestId, error);
      }
      controller.clear();
    };

    invokeHandler(
      () =>
        (handler as (ctx: RpcInvocationContext, ...args: unknown[]) => unknown)(
          ctx,
          ...envelope.args,
        ),
      completeSuccess,
      completeFailure,
    );
  }

  function handleNotify(
    from: PeerAddress,
    envelope: Extract<RpcEnvelope, { kind: "notify" }>,
  ): void {
    const descriptor = getDescriptor(envelope.method);
    if (!descriptor || descriptor.kind === "stream") {
      emitDiagnostic({
        type: "handler-error",
        method: envelope.method,
        peer: from,
        error: new RpcError(
          descriptor ? "invalid-contract" : "method-not-found",
          `Notification rejected for method "${envelope.method}".`,
          { peer: from },
        ),
      });
      return;
    }

    const handler = getHandler(envelope.method);
    if (!handler) {
      emitDiagnostic({
        type: "handler-error",
        method: envelope.method,
        peer: from,
        error: new RpcError(
          "method-not-found",
          `No handler registered for "${envelope.method}".`,
          {
            peer: from,
          },
        ),
      });
      return;
    }

    const controller = createCancelController();
    const op: InboundNotifyOperation = {
      opId: nextOpId++,
      peer: from,
      peerKey: peerAddressKey(from),
      controller,
      finished: false,
    };
    notifyOps.add(op);

    const ctx: RpcInvocationContext = {
      peer: from,
      signal: controller.signal,
      isNotification: true,
    };

    const finishSuccess = () => {
      notifyOps.delete(op);
      op.finished = true;
      controller.clear();
    };

    const finishFailure = (error: unknown) => {
      notifyOps.delete(op);
      op.finished = true;
      emitDiagnostic({
        type: "handler-error",
        method: envelope.method,
        peer: from,
        error,
      });
      controller.clear();
    };

    invokeHandler(
      () =>
        (handler as (ctx: RpcInvocationContext, ...args: unknown[]) => unknown)(
          ctx,
          ...envelope.args,
        ),
      finishSuccess,
      finishFailure,
    );
  }

  function handleCancel(
    from: PeerAddress,
    envelope: Extract<RpcEnvelope, { kind: "cancel" }>,
  ): void {
    const correlationKey = `${peerAddressKey(from)}\0${envelope.requestId}`;
    const bucket = requestOpsByCorrelation.get(correlationKey);
    if (!bucket) return;

    const matching = [...bucket];
    requestOpsByCorrelation.delete(correlationKey);

    const reasonError = envelope.reason
      ? new RpcError(envelope.reason.code, envelope.reason.message, {
          peer: from,
          ...(envelope.reason.remoteName !== undefined
            ? { remoteName: envelope.reason.remoteName }
            : {}),
        })
      : new RpcError("aborted", "Invocation cancelled by remote peer.", {
          peer: from,
        });

    for (const op of matching) {
      op.cancelled = true;
      op.controller.abort(reasonError);
    }
  }

  function retirePeer(peerKey: string, disconnectError: RpcError): void {
    for (const [correlationKey, bucket] of [
      ...requestOpsByCorrelation.entries(),
    ]) {
      for (const op of [...bucket]) {
        if (op.peerKey === peerKey) {
          bucket.delete(op);
          op.cancelled = true;
          op.controller.abort(disconnectError);
        }
      }
      if (bucket.size === 0) {
        requestOpsByCorrelation.delete(correlationKey);
      }
    }

    for (const op of [...notifyOps]) {
      if (op.peerKey === peerKey) {
        notifyOps.delete(op);
        op.finished = true;
        op.controller.abort(disconnectError);
      }
    }
  }

  function closeAll(closeError: RpcError): void {
    const activeRequests: InboundRequestOperation[] = [];
    for (const bucket of requestOpsByCorrelation.values()) {
      for (const op of bucket) {
        activeRequests.push(op);
      }
    }
    requestOpsByCorrelation.clear();
    for (const op of activeRequests) {
      op.cancelled = true;
      op.controller.abort(closeError);
    }

    const activeNotifies = [...notifyOps];
    notifyOps.clear();
    for (const op of activeNotifies) {
      op.finished = true;
      op.controller.abort(closeError);
    }
  }

  return {
    handleRequest,
    handleNotify,
    handleCancel,
    retirePeer,
    closeAll,
  };
}
