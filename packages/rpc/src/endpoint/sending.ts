import type { RpcMethodDescriptor } from "../contracts.js";
import { serialiseRpcError } from "../errors.js";
import type {
  PeerAddress,
  RpcCodec,
  RpcDiagnosticEvent,
  RpcEnvelope,
  RpcTransport,
} from "../types.js";
import { isPromiseLike, prepareOutboundResult, toRpcError } from "./envelopes.js";

/** Dependencies required by the endpoint sending boundary. */
export interface EndpointSenderOptions<
  Wire,
  PostOptions,
  TransferResource,
  SupportsTransfer extends boolean,
> {
  readonly codec: Pick<RpcCodec<RpcEnvelope, Wire>, "encode">;
  readonly transport: Pick<
    RpcTransport<Wire, PostOptions, TransferResource, SupportsTransfer>,
    "capabilities" | "send"
  >;
  readonly localPeer: PeerAddress;
  readonly emitDiagnostic: (event: RpcDiagnosticEvent) => void;
}

/** Focused codec/transport sending boundary for an RPC endpoint. */
export interface EndpointSender<Wire, PostOptions, TransferResource> {
  /** Encodes and dispatches an envelope, reporting late/async failures via diagnostics. */
  dispatchBestEffort(
    target: PeerAddress,
    envelope: RpcEnvelope,
    postOptions: PostOptions | undefined,
    transfer: readonly TransferResource[] | undefined,
    operation: string,
  ): Promise<void>;
  /** Prepares, encodes, and sends a successful handler response, falling back on encode error. */
  sendSuccessResponse(
    target: PeerAddress,
    requestId: string,
    descriptor: RpcMethodDescriptor,
    rawResult: unknown,
  ): void;
  /** Encodes and sends a serialised error response frame. */
  sendErrorResponse(target: PeerAddress, requestId: string, error: unknown): void;
  /** Encodes a shared notification envelope for preflight validation or `sendMany`. */
  encodeSharedNotify(method: string, values: readonly unknown[]): Wire;
}

/** Creates the codec/send boundary for an RPC endpoint. */
export function createEndpointSender<
  Wire,
  PostOptions,
  TransferResource,
  SupportsTransfer extends boolean,
>(
  options: EndpointSenderOptions<Wire, PostOptions, TransferResource, SupportsTransfer>,
): EndpointSender<Wire, PostOptions, TransferResource> {
  const { codec, transport, localPeer, emitDiagnostic } = options;
  const supportsTransfer = transport.capabilities.supportsTransfer;

  function dispatchBestEffort(
    target: PeerAddress,
    envelope: RpcEnvelope,
    postOptions: PostOptions | undefined,
    transfer: readonly TransferResource[] | undefined,
    operation: string,
  ): Promise<void> {
    let encoded: Wire;
    try {
      encoded = codec.encode(envelope);
    } catch (error) {
      const rpcError = toRpcError("encode-failed", error, target);
      emitDiagnostic({ type: "late-send-failure", operation, error: rpcError });
      return Promise.resolve();
    }

    try {
      const result = transport.send(
        target,
        encoded,
        postOptions,
        transfer && transfer.length > 0 ? transfer : undefined,
      );
      if (isPromiseLike(result)) {
        return Promise.resolve(result).catch((error: unknown) => {
          emitDiagnostic({
            type: "late-send-failure",
            operation,
            error: toRpcError("send-failed", error, target),
          });
        });
      }
      return Promise.resolve();
    } catch (error) {
      emitDiagnostic({
        type: "late-send-failure",
        operation,
        error: toRpcError("send-failed", error, target),
      });
      return Promise.resolve();
    }
  }

  function sendSuccessResponse(
    target: PeerAddress,
    requestId: string,
    descriptor: RpcMethodDescriptor,
    rawResult: unknown,
  ): void {
    let responseEnvelope: RpcEnvelope;
    let transferList: TransferResource[] = [];

    try {
      const prepared = prepareOutboundResult(
        rawResult,
        descriptor.outputTransfer,
        supportsTransfer,
        target,
      );
      transferList = prepared.transfer as TransferResource[];
      responseEnvelope = {
        kind: "response",
        version: 1,
        requestId,
        sender: localPeer,
        target,
        ok: true,
        result: prepared.value,
      };
    } catch (error) {
      const serialised = serialiseRpcError(toRpcError("transfer-failed", error, target));
      responseEnvelope = {
        kind: "response",
        version: 1,
        requestId,
        sender: localPeer,
        target,
        ok: false,
        error: serialised,
      };
      transferList = [];
    }

    let encoded: Wire;
    try {
      encoded = codec.encode(responseEnvelope);
    } catch (error) {
      const encodeError = toRpcError("encode-failed", error, target);
      emitDiagnostic({
        type: "late-send-failure",
        operation: "response-encode",
        error: encodeError,
      });
      if (responseEnvelope.ok) {
        const fallbackEnvelope: RpcEnvelope = {
          kind: "response",
          version: 1,
          requestId,
          sender: localPeer,
          target,
          ok: false,
          error: {
            code: "encode-failed",
            message: encodeError.message,
          },
        };
        void dispatchBestEffort(
          target,
          fallbackEnvelope,
          undefined,
          undefined,
          "response-error-fallback",
        );
      }
      return;
    }

    const handleResponseSendFailure = (error: unknown) => {
      const sendError = toRpcError("send-failed", error, target);
      emitDiagnostic({
        type: "late-send-failure",
        operation: "response-send",
        error: sendError,
      });
      if (responseEnvelope.ok && sendError.code === "transfer-failed") {
        sendErrorResponse(target, requestId, sendError);
      }
    };

    try {
      const sendResult = transport.send(
        target,
        encoded,
        undefined,
        transferList.length > 0 ? transferList : undefined,
      );
      if (isPromiseLike(sendResult)) {
        void Promise.resolve(sendResult).catch(handleResponseSendFailure);
      }
    } catch (error) {
      handleResponseSendFailure(error);
    }
  }

  function sendErrorResponse(target: PeerAddress, requestId: string, error: unknown): void {
    const envelope: RpcEnvelope = {
      kind: "response",
      version: 1,
      requestId,
      sender: localPeer,
      target,
      ok: false,
      error: serialiseRpcError(error),
    };
    void dispatchBestEffort(target, envelope, undefined, undefined, "response-error");
  }

  function encodeSharedNotify(method: string, values: readonly unknown[]): Wire {
    const sharedEnvelope: RpcEnvelope = {
      kind: "notify",
      version: 1,
      sender: localPeer,
      method,
      args: values,
    };
    try {
      return codec.encode(sharedEnvelope);
    } catch (error) {
      throw toRpcError("encode-failed", error);
    }
  }

  return {
    dispatchBestEffort,
    sendSuccessResponse,
    sendErrorResponse,
    encodeSharedNotify,
  };
}
