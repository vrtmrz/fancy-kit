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

function reportWaitCleanupFailure(
  context: Pick<RegisterPendingWaitContext, "onProtocolWarning">,
  peerId: string,
  error: unknown,
): void {
  try {
    context.onProtocolWarning?.(
      "Failed to release RPC pending wait: " + String(error),
      peerId,
    );
  } catch {
    // Diagnostics must not prevent invocation settlement or further cleanup.
  }
}

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
 * Creates a wait record, deadline, and abort listener before the caller sends.
 * The record is registered before injected hooks run so re-entrant peer
 * retirement can release it; a setup exception removes it before propagating.
 */
export function registerPendingWait(
  context: RegisterPendingWaitContext,
  requestId: string,
  peerId: string,
  method: string,
  options: RpcCallOptions,
  timeoutMs: number,
  resolve: PendingInvocation["resolve"],
  reject: PendingInvocation["reject"],
): PendingInvocation {
  const { pending, scheduleTimeout, rejectPending } = context;
  const signal = options.signal;
  const onAbort = () => {
    if (pending.get(requestId) !== invocation) {
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
  const releaseWait = () => {
    const cleanups = [
      () => deadline?.dispose(),
      () => signal?.removeEventListener("abort", onAbort),
    ];
    for (const cleanup of cleanups) {
      try {
        cleanup();
      } catch (error) {
        reportWaitCleanupFailure(context, peerId, error);
      }
    }
  };
  const invocation: PendingInvocation = {
    peerId,
    resolve,
    reject,
    releaseWait,
    requestSent: false,
    cancelRequested: false,
  };
  pending.set(requestId, invocation);

  try {
    deadline?.schedule(timeoutMs);
    if (signal && pending.get(requestId) === invocation) {
      signal.addEventListener("abort", onAbort, { once: true });
      if (pending.get(requestId) !== invocation) {
        // A re-entrant hook may have retired the wait before attaching the listener.
        invocation.releaseWait();
      } else if (signal.aborted) {
        onAbort();
      }
    }
  } catch (error) {
    if (pending.get(requestId) === invocation) {
      pending.delete(requestId);
    }
    invocation.releaseWait();
    throw error;
  }
  return invocation;
}
