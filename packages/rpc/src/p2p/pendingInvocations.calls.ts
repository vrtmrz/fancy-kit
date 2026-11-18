import { promiseWithResolvers } from "octagonal-wheels/promises";
import { RpcError } from "./RpcError.js";
import type {
  JsonLike,
  RpcCallOptions,
  RpcResponseErrorEnvelope,
  RpcResponseEnvelope,
} from "./types.js";
import type {
  PendingInvocation,
  InvokePendingInvocationContext,
  CancelPendingInvocationContext,
  ReceivePendingResponseContext,
  RejectPendingForPeerDepartureContext,
  ClosePendingInvocationsContext,
} from "./pendingInvocations.types.js";

/**
 * Registers and sends one response-bearing request, then waits for its
 * matching response. The returned promise resolves with response data and
 * rejects with remote RPC errors, a request-send failure, or local RpcError
 * outcomes: CANCELLED for abort or explicit cancellation, TIMEOUT for the
 * deadline, and NOT_CONNECTED for peer or room disconnection.
 *
 * Transport send completion only establishes whether cancellation can be
 * sent immediately; it is not the remote operation's result. A non-positive
 * timeout disables the deadline while keeping abort and other settlement
 * paths active. An already-aborted signal rejects before allocating an ID,
 * scheduling a deadline, registering a listener, or sending the request.
 *
 * @param timeoutOrOptions - A timeout in milliseconds or RPC call options.
 * Non-positive timeouts disable only the deadline; an AbortSignal remains
 * active.
 */
export async function invokePendingInvocation(
  context: InvokePendingInvocationContext,
  peerId: string,
  method: string,
  args: JsonLike[],
  timeoutOrOptions: number | RpcCallOptions = 30000,
): Promise<JsonLike> {
  const {
    pending,
    sendEnvelope,
    createRequestId,
    registerPendingWait,
    removePending,
    notifyRemoteCancellation,
  } = context;
  const options: RpcCallOptions =
    typeof timeoutOrOptions === "number"
      ? { timeoutMs: timeoutOrOptions }
      : (timeoutOrOptions ?? {});
  const timeoutMs = options.timeoutMs ?? 30000;
  if (options.signal?.aborted) {
    throw new RpcError("CANCELLED", "RPC cancelled: " + method);
  }
  const requestId = createRequestId();
  const result = promiseWithResolvers<JsonLike>();
  let invocation: PendingInvocation;
  try {
    invocation = registerPendingWait(
      requestId,
      peerId,
      method,
      options,
      timeoutMs,
      result.resolve,
      result.reject,
    );
  } catch (error) {
    // A re-entrant hook can settle before throwing; consume that intermediate outcome.
    void result.promise.catch(() => undefined);
    throw error;
  }

  if (pending.get(requestId) !== invocation) {
    return await result.promise;
  }

  const sendTask = sendEnvelope(peerId, {
    kind: "request",
    requestId,
    method,
    args,
  });
  void sendTask.then(
    () => {
      // This captured record survives removal from the map. If a local outcome requested cancellation while the
      // send was held, retain that intent and send cancel only after request.
      const current = pending.get(requestId);
      invocation.requestSent = true;
      if (!current && invocation.cancelRequested) {
        notifyRemoteCancellation(peerId, requestId);
      }
    },
    (error: unknown) => {
      // A response or local outcome may have settled and removed this wait first. Consume that late send failure;
      // otherwise, propagate the send failure as the invocation's local outcome.
      const current = pending.get(requestId);
      if (!current) {
        return;
      }
      const failed = removePending(requestId);
      if (failed) {
        failed.reject(error);
      }
    },
  );

  return await result.promise;
}

/**
 * Rejects a matching local wait and requests remote cancellation.
 *
 * If its request send is still pending, returns after local rejection; the
 * send-completion path will preserve request-before-cancel wire order. If the
 * request has already been sent, this call waits for the cancel send.
 * Failure from that immediate send rejects this call; a deferred send uses
 * the background warning path. An unknown ID or an ID owned by another peer
 * still sends the supplied cancellation envelope, preserving
 * RpcRoom.cancel behaviour.
 */
export async function cancelPendingInvocation(
  context: CancelPendingInvocationContext,
  peerId: string,
  requestId: string,
): Promise<void> {
  const { pending, sendEnvelope, rejectPending } = context;
  const invocation = pending.get(requestId);
  if (invocation?.peerId === peerId) {
    const requestSent = invocation.requestSent;
    invocation.cancelRequested = true;
    rejectPending(requestId, new RpcError("CANCELLED", "Invocation cancelled"));
    // An in-flight request is cancelled after its send settles.
    if (!requestSent) {
      return;
    }
  }
  await sendEnvelope(peerId, {
    kind: "cancel",
    requestId,
  });
}

/**
 * Settles the wait for a matching peer and request ID, resolving successful data
 * or rejecting with the remote error's code, message, and details.
 * Unknown IDs are ignored, including unsolicited or surplus replies from
 * peers that answer one-way notifications.
 */
export function receivePendingResponse(
  context: ReceivePendingResponseContext,
  envelope: RpcResponseEnvelope | RpcResponseErrorEnvelope,
  peerId: string,
): void {
  const { pending, removePending } = context;
  if (pending.get(envelope.requestId)?.peerId !== peerId) {
    return;
  }
  const settled = removePending(envelope.requestId);
  if (!settled) {
    return;
  }
  if (envelope.ok === true) {
    settled.resolve(envelope.data);
  } else {
    settled.reject(
      new RpcError(
        envelope.error.code,
        envelope.error.message,
        envelope.error.details,
      ),
    );
  }
}

/**
 * Rejects this peer's local waits without attempting remote cancellation:
 * a departed peer is no longer available to receive it.
 */
export function rejectPendingForPeerDeparture(
  context: RejectPendingForPeerDepartureContext,
  peerId: string,
): void {
  const { pending, rejectPending } = context;
  pending.forEach((invocation, requestId) => {
    if (invocation.peerId !== peerId) {
      return;
    }
    rejectPending(
      requestId,
      new RpcError("NOT_CONNECTED", "Peer disconnected"),
    );
  });
}

/**
 * Rejects all local waits with NOT_CONNECTED and requests remote
 * cancellation for sent requests. RpcRoom calls this before clearing its
 * state, while the send callback is still usable. Requests still being sent
 * carry cancellation intent until their send completes.
 */
export function closePendingInvocations(
  context: ClosePendingInvocationsContext,
): void {
  const { pending, rejectPending } = context;
  pending.forEach((_invocation, requestId) => {
    rejectPending(
      requestId,
      new RpcError("NOT_CONNECTED", "Room closed"),
      true,
    );
  });
}
