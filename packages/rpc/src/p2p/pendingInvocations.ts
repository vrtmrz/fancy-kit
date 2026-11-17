import { bindContext } from "octagonal-wheels/context";
import type {
  PendingInvocation,
  PendingInvocationsOptions,
  PendingInvocationState,
} from "./pendingInvocations.types.js";
import {
  removePending,
  notifyRemoteCancellation,
  rejectPending,
  registerPendingWait,
} from "./pendingInvocations.waits.js";
import {
  invokePendingInvocation,
  cancelPendingInvocation,
  receivePendingResponse,
  rejectPendingForPeerDeparture,
  closePendingInvocations,
} from "./pendingInvocations.calls.js";

/**
 * Creates the owner for outbound response-bearing invocation waits.
 *
 * RpcRoom checks method names and room-open state, and owns envelope
 * serialisation, transport, chunking, and inbound requests. This component
 * owns pending request IDs, wait resources, cancellation sequencing, and
 * response-to-promise settlement.
 *
 * The Room supplies narrow callbacks rather than its full state. Completing a
 * request send records wire progress but does not complete the invocation;
 * only a matching response supplies its remote result. The returned operations
 * also handle explicit cancellation, response dispatch, peer departure, and close.
 */
export function createPendingInvocations({
  sendEnvelope,
  createRequestId,
  scheduleTimeout,
  onProtocolWarning,
}: PendingInvocationsOptions) {
  const state: PendingInvocationState = {
    pending: new Map<string, PendingInvocation>(),
  };
  const removeOperation = bindContext(state, removePending);
  const notifyRemoteCancellationOperation = bindContext(
    { sendEnvelope, onProtocolWarning },
    notifyRemoteCancellation,
  );
  const rejectOperation = bindContext(
    {
      pending: state.pending,
      removePending: removeOperation,
      notifyRemoteCancellation: notifyRemoteCancellationOperation,
    },
    rejectPending,
  );
  const registerPendingWaitOperation = bindContext(
    { pending: state.pending, scheduleTimeout, rejectPending: rejectOperation },
    registerPendingWait,
  );
  const invoke = bindContext(
    {
      pending: state.pending,
      sendEnvelope,
      createRequestId,
      registerPendingWait: registerPendingWaitOperation,
      removePending: removeOperation,
      notifyRemoteCancellation: notifyRemoteCancellationOperation,
    },
    invokePendingInvocation,
  );
  const cancel = bindContext(
    { pending: state.pending, sendEnvelope, rejectPending: rejectOperation },
    cancelPendingInvocation,
  );
  const receiveResponse = bindContext(
    { pending: state.pending, removePending: removeOperation },
    receivePendingResponse,
  );
  const peerLeft = bindContext(
    { pending: state.pending, rejectPending: rejectOperation },
    rejectPendingForPeerDeparture,
  );
  const close = bindContext(
    { pending: state.pending, rejectPending: rejectOperation },
    closePendingInvocations,
  );

  return { invoke, cancel, receiveResponse, peerLeft, close };
}
