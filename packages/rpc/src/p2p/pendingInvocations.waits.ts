import { createDeferredAction } from "octagonal-wheels/concurrency/deferredAction";
import { RpcError } from "./RpcError.js";
import type { RpcCallOptions } from "./types.js";
import type {
  PendingInvocation,
  RemovePendingContext,
  NotifyRemoteCancellationContext,
  RejectPendingContext,
  RegisterPendingWaitContext,
} from "./pendingInvocations.types.js";

/**
 * Removes a wait and synchronously releases its deadline and abort listener
 * before returning the invocation to its caller.
 */
export function removePending(
  context: RemovePendingContext,
  requestId: string,
): PendingInvocation | undefined {
  const { pending } = context;
  const invocation = pending.get(requestId);
  if (!invocation) {
    return undefined;
  }
  pending.delete(requestId);
  invocation.releaseWait();
  return invocation;
}

/** Sends cancellation without delaying the local outcome; reports a failed background send. */
export function notifyRemoteCancellation(
  context: NotifyRemoteCancellationContext,
  peerId: string,
  requestId: string,
): void {
  const { sendEnvelope, onProtocolWarning } = context;
  void sendEnvelope(peerId, { kind: "cancel", requestId }).catch(
    (error: unknown) => {
      onProtocolWarning?.(
        "Failed to send RPC cancellation: " + String(error),
        peerId,
      );
    },
  );
}

/**
 * Rejects a live wait. When remote cancellation is requested, records that
 * intent even if the request send has not completed yet.
 */
export function rejectPending(
  context: RejectPendingContext,
  requestId: string,
  error: RpcError,
  notifyRemote = false,
): void {
  const { pending, removePending, notifyRemoteCancellation } = context;
  const invocation = pending.get(requestId);
  if (!invocation) {
    return;
  }
  if (notifyRemote) {
    invocation.cancelRequested = true;
  }
  const removed = removePending(requestId);
  if (!removed) {
    return;
  }
  removed.reject(error);
  if (notifyRemote && removed.requestSent) {
    notifyRemoteCancellation(removed.peerId, requestId);
  }
}

/**
 * Creates a wait record, deadline, and abort listener. The creation callback
 * retains the current Promise executor boundary before deadline setup can throw.
 */
export function registerPendingWait(
  context: RegisterPendingWaitContext,
  requestId: string,
  peerId: string,
  method: string,
  options: RpcCallOptions,
  timeoutMs: number,
  onInvocationCreated: (invocation: PendingInvocation) => void,
  resolve: PendingInvocation["resolve"],
  reject: PendingInvocation["reject"],
): void {
  const { pending, scheduleTimeout, rejectPending } = context;
  const signal = options.signal;
  const onAbort = () => {
    const current = pending.get(requestId);
    if (!current) {
      return;
    }
    rejectPending(
      requestId,
      new RpcError("CANCELLED", "RPC cancelled: " + method),
      true,
    );
  };
  // A non-positive timeout retains the existing no-deadline policy.
  const deadline =
    timeoutMs > 0
      ? createDeferredAction(() => {
          rejectPending(
            requestId,
            new RpcError("TIMEOUT", "RPC timed out: " + method),
            true,
          );
        }, scheduleTimeout)
      : undefined;
  const invocation: PendingInvocation = {
    peerId,
    resolve,
    reject,
    releaseWait: () => {
      deadline?.dispose();
      signal?.removeEventListener("abort", onAbort);
    },
    requestSent: false,
    cancelRequested: false,
  };
  onInvocationCreated(invocation);
  deadline?.schedule(timeoutMs);
  pending.set(requestId, invocation);
  if (signal) {
    signal.addEventListener("abort", onAbort, { once: true });
    // An embedding host can abort between the check above and listener registration.
    if (signal.aborted) {
      onAbort();
    }
  }
}
