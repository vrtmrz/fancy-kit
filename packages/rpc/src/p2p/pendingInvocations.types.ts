import type { TimeoutScheduler } from "octagonal-wheels/concurrency/deferredAction";
import type { RpcError } from "./RpcError.js";
import type { JsonLike, RpcCallOptions, RpcEnvelope } from "./types.js";

export type PendingInvocation = {
  peerId: string;
  resolve: (value: JsonLike) => void;
  reject: (reason?: unknown) => void;
  releaseWait: () => void;
  /** Set only after the request send completes, so cancellation can follow it on the wire. */
  requestSent: boolean;
  /** Kept on the send task's captured record after map removal until cancellation sequencing is complete. */
  cancelRequested: boolean;
};

export type PendingInvocationsOptions = {
  /** Calls RpcRoom's current envelope sender at invocation time; the Room owns wire serialisation and chunking. */
  sendEnvelope: (peerId: string, envelope: RpcEnvelope) => Promise<void>;
  /** Uses RpcRoom's existing request-ID generator, shared with its other request-envelope producers. */
  createRequestId: () => string;
  /** Uses RpcRoom's compatibility timer scheduler; non-positive timeout values do not schedule a deadline. */
  scheduleTimeout: TimeoutScheduler;
  /** Reports failures from background cancellation sends. */
  onProtocolWarning?: ((message: string, peerId: string) => void) | undefined;
};

export type PendingInvocationState = {
  pending: Map<string, PendingInvocation>;
};

export type RemovePendingContext = Pick<PendingInvocationState, "pending">;

export type RemovePendingOperation = (
  requestId: string,
) => PendingInvocation | undefined;

export type NotifyRemoteCancellationContext = Pick<
  PendingInvocationsOptions,
  "sendEnvelope" | "onProtocolWarning"
>;

export type NotifyRemoteCancellationOperation = (
  peerId: string,
  requestId: string,
) => void;

export type RejectPendingContext = Pick<PendingInvocationState, "pending"> & {
  removePending: RemovePendingOperation;
  notifyRemoteCancellation: NotifyRemoteCancellationOperation;
};

export type RejectPendingOperation = (
  requestId: string,
  error: RpcError,
  notifyRemote?: boolean,
) => void;

export type RegisterPendingWaitContext = Pick<
  PendingInvocationState,
  "pending"
> &
  Pick<PendingInvocationsOptions, "scheduleTimeout"> & {
    rejectPending: RejectPendingOperation;
  };

export type RegisterPendingWaitOperation = (
  requestId: string,
  peerId: string,
  method: string,
  options: RpcCallOptions,
  timeoutMs: number,
  onInvocationCreated: (invocation: PendingInvocation) => void,
  resolve: PendingInvocation["resolve"],
  reject: PendingInvocation["reject"],
) => void;

export type InvokePendingInvocationContext = Pick<
  PendingInvocationState,
  "pending"
> &
  Pick<PendingInvocationsOptions, "sendEnvelope" | "createRequestId"> & {
    registerPendingWait: RegisterPendingWaitOperation;
    removePending: RemovePendingOperation;
    notifyRemoteCancellation: NotifyRemoteCancellationOperation;
  };

export type CancelPendingInvocationContext = Pick<
  PendingInvocationState,
  "pending"
> &
  Pick<PendingInvocationsOptions, "sendEnvelope"> & {
    rejectPending: RejectPendingOperation;
  };

export type ReceivePendingResponseContext = Pick<
  PendingInvocationState,
  "pending"
> & {
  removePending: RemovePendingOperation;
};

export type RejectPendingForPeerDepartureContext = Pick<
  PendingInvocationState,
  "pending"
> & {
  rejectPending: RejectPendingOperation;
};

export type ClosePendingInvocationsContext =
  RejectPendingForPeerDepartureContext;
