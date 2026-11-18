import { RpcError } from "../RpcError.js";
import type { RpcMethodDescriptor } from "../contracts.js";
import { serialiseRpcError } from "../errors.js";
import type {
  PeerAddress,
  RpcCallOptions,
  RpcCodec,
  RpcDiagnosticEvent,
  RpcEnvelope,
  RpcIdGenerator,
  RpcScheduler,
  RpcTransport,
} from "../types.js";
import {
  isPromiseLike,
  peerAddressKey,
  peersEqual,
  prepareOutboundArgs,
  toRpcError,
  type UnwrappedPayload,
} from "./envelopes.js";
import type { EndpointSender } from "./sending.js";

interface PendingCallEntry {
  readonly requestId: string;
  readonly peer: PeerAddress;
  readonly peerKey: string;
  readonly bindingToken: symbol;
  settled: boolean;
  cancelSent: boolean;
  readonly resolve: (value: unknown) => void;
  readonly reject: (reason: unknown) => void;
  cancelTimer?: () => void;
  cleanupAbort?: () => void;
}

/** Dependencies required by the outbound pending-call owner. */
export interface PendingCallRegistryOptions<
  Wire,
  PostOptions,
  TransferResource,
  SupportsTransfer extends boolean,
> {
  readonly localPeer: PeerAddress;
  readonly codec: Pick<RpcCodec<RpcEnvelope, Wire>, "encode">;
  readonly transport: Pick<
    RpcTransport<Wire, PostOptions, TransferResource, SupportsTransfer>,
    "capabilities" | "send"
  >;
  readonly scheduler: RpcScheduler;
  readonly generateId: RpcIdGenerator;
  readonly sender: Pick<EndpointSender<Wire, PostOptions, TransferResource>, "dispatchBestEffort">;
  readonly emitDiagnostic: (event: RpcDiagnosticEvent) => void;
  readonly isEndpointClosed: () => boolean;
  readonly getCloseReason: () => RpcError | undefined;
}

/** Owner for outbound unary call registration, cancellation, and response matching. */
export interface PendingCallRegistry<PostOptions> {
  /** Executes a unary call against `target`, registering its wait before encoding or sending. */
  invokeCall(
    target: PeerAddress,
    bindingToken: symbol,
    isBindingDisposed: () => boolean,
    method: string,
    descriptor: RpcMethodDescriptor | undefined,
    rawArgs: readonly unknown[],
    callOptions?: RpcCallOptions<PostOptions>,
  ): Promise<unknown>;
  /** Matches an inbound response envelope against an active pending wait. */
  handleResponse(from: PeerAddress, envelope: Extract<RpcEnvelope, { kind: "response" }>): void;
  /** Fails all pending calls belonging to one disposed peer client binding. */
  disposeBinding(bindingToken: symbol, peer: PeerAddress): void;
  /** Fails all pending calls targeting a retired remote peer instance. */
  retirePeer(peerKey: string, disconnectError: RpcError): void;
  /** Fails all pending calls during endpoint teardown. */
  closeAll(closeError: RpcError): void;
}

/** Creates the pending-call owner for an RPC endpoint. */
export function createPendingCallRegistry<
  Wire,
  PostOptions,
  TransferResource,
  SupportsTransfer extends boolean,
>(
  options: PendingCallRegistryOptions<Wire, PostOptions, TransferResource, SupportsTransfer>,
): PendingCallRegistry<PostOptions> {
  const {
    localPeer,
    codec,
    transport,
    scheduler,
    generateId,
    sender,
    emitDiagnostic,
    isEndpointClosed,
    getCloseReason,
  } = options;
  const supportsTransfer = transport.capabilities.supportsTransfer;
  const pendingCalls = new Map<string, PendingCallEntry>();

  function settlePendingCall(
    entry: PendingCallEntry,
    outcome:
      | { readonly ok: true; readonly value: unknown }
      | { readonly ok: false; readonly error: unknown },
  ): boolean {
    if (entry.settled) return false;
    entry.settled = true;
    pendingCalls.delete(entry.requestId);
    try {
      entry.cancelTimer?.();
    } catch {
      // Timer cleanup failure must not block abort cleanup or settlement.
    }
    try {
      entry.cleanupAbort?.();
    } catch {
      // Abort cleanup failure must not block settlement.
    }
    if (outcome.ok) {
      entry.resolve(outcome.value);
    } else {
      entry.reject(outcome.error);
    }
    return true;
  }

  function invokeCall(
    target: PeerAddress,
    bindingToken: symbol,
    isBindingDisposed: () => boolean,
    method: string,
    descriptor: RpcMethodDescriptor | undefined,
    rawArgs: readonly unknown[],
    callOptions?: RpcCallOptions<PostOptions>,
  ): Promise<unknown> {
    if (isEndpointClosed() || isBindingDisposed()) {
      return Promise.reject(
        getCloseReason() ??
          new RpcError("disconnected", "RPC peer binding or endpoint is closed.", { peer: target }),
      );
    }
    if (!descriptor || descriptor.kind !== "call") {
      return Promise.reject(
        new RpcError("invalid-contract", `Method "${method}" is not a callable method.`, {
          peer: target,
        }),
      );
    }
    if (!Array.isArray(rawArgs)) {
      return Promise.reject(
        new RpcError("invalid-contract", `Arguments for "${method}" must be passed as an array.`, {
          peer: target,
        }),
      );
    }
    if (callOptions?.signal?.aborted) {
      return Promise.reject(
        new RpcError("aborted", "Call aborted before sending.", {
          peer: target,
          cause: callOptions.signal.reason,
        }),
      );
    }

    let prepared: UnwrappedPayload;
    try {
      prepared = prepareOutboundArgs(
        rawArgs,
        descriptor.inputTransfer,
        supportsTransfer,
        target,
      );
    } catch (error) {
      return Promise.reject(toRpcError("transfer-failed", error, target));
    }

    const requestId = generateId();
    const requestEnvelope: RpcEnvelope = {
      kind: "request",
      version: 1,
      requestId,
      sender: localPeer,
      target,
      method,
      args: prepared.values,
    };

    return new Promise<unknown>((resolve, reject) => {
      const entry: PendingCallEntry = {
        requestId,
        peer: target,
        peerKey: peerAddressKey(target),
        bindingToken,
        settled: false,
        cancelSent: false,
        resolve,
        reject,
      };

      // Register wait before resource setup, encoding, or sending (CALL-1).
      pendingCalls.set(requestId, entry);

      let resolveRequestSend!: (dispatched: boolean) => void;
      const requestSendPromise = new Promise<boolean>((resolveSend) => {
        resolveRequestSend = resolveSend;
      });

      const triggerRemoteCancel = (reasonError: RpcError) => {
        if (entry.cancelSent) return;
        entry.cancelSent = true;
        void requestSendPromise.then((dispatched) => {
          if (!dispatched || isEndpointClosed()) return;
          const cancelEnvelope: RpcEnvelope = {
            kind: "cancel",
            version: 1,
            requestId,
            sender: localPeer,
            target,
            reason: serialiseRpcError(reasonError),
          };
          void sender.dispatchBestEffort(
            target,
            cancelEnvelope,
            callOptions?.postOptions,
            undefined,
            "cancel",
          );
        });
      };

      // Treat deadline allocation, abort subscription, and encoding as one owned setup step
      // so any collaborator failure rolls back all already-acquired resources cleanly.
      let encoded: Wire;
      try {
        const timeoutMs = callOptions?.timeoutMs;
        if (timeoutMs !== undefined && Number.isFinite(timeoutMs) && timeoutMs > 0) {
          entry.cancelTimer = scheduler.setTimeout(() => {
            const timeoutError = new RpcError(
              "timeout",
              `RPC call "${method}" timed out after ${timeoutMs} ms.`,
              { peer: target },
            );
            if (settlePendingCall(entry, { ok: false, error: timeoutError })) {
              triggerRemoteCancel(timeoutError);
            }
          }, timeoutMs);
        }

        const abortSignal = callOptions?.signal;
        if (abortSignal !== undefined) {
          const onAbort = () => {
            const abortError = new RpcError("aborted", `RPC call "${method}" was aborted.`, {
              peer: target,
              cause: abortSignal.reason,
            });
            if (settlePendingCall(entry, { ok: false, error: abortError })) {
              triggerRemoteCancel(abortError);
            }
          };
          abortSignal.addEventListener("abort", onAbort, { once: true });
          entry.cleanupAbort = () => {
            abortSignal.removeEventListener("abort", onAbort);
          };
        }

        try {
          encoded = codec.encode(requestEnvelope);
        } catch (encodeError) {
          throw toRpcError("encode-failed", encodeError, target);
        }
      } catch (setupError) {
        resolveRequestSend(false);
        settlePendingCall(entry, { ok: false, error: setupError });
        return;
      }

      if (entry.settled || isEndpointClosed() || isBindingDisposed()) {
        resolveRequestSend(false);
        return;
      }

      try {
        const sendOutcome = transport.send(
          target,
          encoded,
          callOptions?.postOptions,
          prepared.transfer.length > 0
            ? (prepared.transfer as TransferResource[])
            : undefined,
        );
        if (isPromiseLike(sendOutcome)) {
          void Promise.resolve(sendOutcome).then(
            () => {
              resolveRequestSend(true);
            },
            (error: unknown) => {
              resolveRequestSend(false);
              const sendError = toRpcError("send-failed", error, target);
              if (!settlePendingCall(entry, { ok: false, error: sendError })) {
                emitDiagnostic({
                  type: "late-send-failure",
                  operation: "request-send",
                  error: sendError,
                });
              }
            },
          );
        } else {
          resolveRequestSend(true);
        }
      } catch (error) {
        resolveRequestSend(false);
        const sendError = toRpcError("send-failed", error, target);
        if (!settlePendingCall(entry, { ok: false, error: sendError })) {
          emitDiagnostic({
            type: "late-send-failure",
            operation: "request-send",
            error: sendError,
          });
        }
      }
    });
  }

  function handleResponse(
    from: PeerAddress,
    envelope: Extract<RpcEnvelope, { kind: "response" }>,
  ): void {
    const entry = pendingCalls.get(envelope.requestId);
    if (!entry || !peersEqual(entry.peer, from)) {
      emitDiagnostic({
        type: "unmatched-response",
        requestId: envelope.requestId,
        peer: from,
      });
      return;
    }
    if (envelope.ok) {
      settlePendingCall(entry, { ok: true, value: envelope.result });
      return;
    }
    const remoteError = new RpcError(envelope.error.code, envelope.error.message, {
      peer: from,
      ...(envelope.error.remoteName !== undefined
        ? { remoteName: envelope.error.remoteName }
        : {}),
    });
    settlePendingCall(entry, { ok: false, error: remoteError });
  }

  function disposeBinding(bindingToken: symbol, peer: PeerAddress): void {
    const disconnectError = new RpcError("disconnected", "Peer client binding disposed.", {
      peer,
    });
    for (const entry of [...pendingCalls.values()]) {
      if (entry.bindingToken === bindingToken) {
        settlePendingCall(entry, { ok: false, error: disconnectError });
      }
    }
  }

  function retirePeer(peerKey: string, disconnectError: RpcError): void {
    for (const entry of [...pendingCalls.values()]) {
      if (entry.peerKey === peerKey) {
        settlePendingCall(entry, { ok: false, error: disconnectError });
      }
    }
  }

  function closeAll(closeError: RpcError): void {
    for (const entry of [...pendingCalls.values()]) {
      settlePendingCall(entry, { ok: false, error: closeError });
    }
  }

  return {
    invokeCall,
    handleResponse,
    disposeBinding,
    retirePeer,
    closeAll,
  };
}
