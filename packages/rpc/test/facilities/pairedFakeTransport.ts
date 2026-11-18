import type {
  PeerAddress,
  RpcTransport,
  TransportCapabilities,
} from "../../src/types.js";
import {
  createControllableScheduler,
  type ControllableScheduler,
} from "./controllableScheduler.js";

/** Delivery scheduling mode for a fake endpoint's outbound messages. */
export type FakeDeliveryMode =
  | { readonly kind: "sync" }
  | { readonly kind: "delayed"; readonly delayMs: number }
  | { readonly kind: "manual" };

/** Controls when the Promise returned by `send()` settles relative to delivery. */
export type FakeSendSettlementMode = "immediate" | "after-delivery" | "manual";

/** Fault behaviour injected on the next outbound `send` call. */
export type FakeSendFault =
  | { readonly kind: "throw"; readonly error: unknown }
  | { readonly kind: "reject-before-delivery"; readonly error: unknown }
  | { readonly kind: "reject-after-delivery"; readonly error: unknown };

/** Recorded outbound `send` invocation on a fake transport endpoint. */
export interface FakeSentMessage<Wire, PostOptions, TransferResource> {
  readonly target: PeerAddress;
  readonly payload: Wire;
  readonly options: PostOptions | undefined;
  readonly transfer: readonly TransferResource[] | undefined;
}

interface PendingSendEntry {
  settled: boolean;
  delivered: boolean;
  readonly resolve: () => void;
  readonly reject: (error: unknown) => void;
}

/** Fake endpoint implementing {@link RpcTransport} with test fault controls. */
export interface FakeTransportEndpoint<
  Wire = unknown,
  PostOptions = undefined,
  TransferResource = never,
  SupportsTransfer extends boolean = false,
> extends RpcTransport<Wire, PostOptions, TransferResource, SupportsTransfer> {
  /** Local peer identity attached to outbound messages delivered to the peer. */
  readonly localPeer: PeerAddress;
  /** Expected counterparty peer identity. */
  readonly remotePeer: PeerAddress;
  /** Outbound sends observed on this endpoint. */
  readonly sentMessages: readonly FakeSentMessage<Wire, PostOptions, TransferResource>[];
  /** Number of currently active `subscribe` listeners. */
  readonly listenerCount: number;
  /** Number of queued manual or scheduled outbound deliveries not yet delivered. */
  readonly pendingDeliveryCount: number;
  /** Number of outbound `send()` promises awaiting completion or rejection. */
  readonly pendingSendCount: number;
  /** Whether the endpoint is disconnected or closed. */
  readonly disconnected: boolean;
  /** Configures subsequent `send` delivery timing. */
  setDeliveryMode(mode: FakeDeliveryMode): void;
  /** Configures when `send()` promises settle (`immediate`, `after-delivery`, or `manual`). */
  setSendSettlementMode(mode: FakeSendSettlementMode): void;
  /** Queues a one-shot fault to apply on the next `send` invocation. */
  queueNextSendFault(fault: FakeSendFault): void;
  /** Resolves the oldest pending `send()` promise (useful in `manual` settlement mode). */
  resolveNextSend(): boolean;
  /** Rejects the oldest pending `send()` promise with `error`. */
  rejectNextSend(error: unknown): boolean;
  /** Resolves all pending `send()` promises in FIFO order. */
  resolveAllSends(): number;
  /** Delivers the oldest manually queued outbound message to the counterparty. */
  flushNext(): boolean;
  /** Delivers all manually queued outbound messages to the counterparty. */
  flushAll(): number;
  /** Injects an inbound message directly, e.g. from a stale instance or wrong peer. */
  injectInbound(from: PeerAddress, payload: unknown): void;
  /** Marks this endpoint disconnected and clears queued work and pending sends. */
  disconnect(reason?: Error): void;
  /** Synchronously closes this endpoint and clears pending deliveries and sends. */
  close(): void;
  /** Returns `true` when listeners, queued deliveries, or pending sends remain active. */
  hasPendingWork(): boolean;
}

/** Paired fake transport bundle returned by {@link createPairedFakeTransport}. */
export interface PairedFakeTransport<
  Wire = unknown,
  PostOptions = undefined,
  TransferResource = never,
  SupportsTransfer extends boolean = false,
> {
  readonly a: FakeTransportEndpoint<Wire, PostOptions, TransferResource, SupportsTransfer>;
  readonly b: FakeTransportEndpoint<Wire, PostOptions, TransferResource, SupportsTransfer>;
  readonly scheduler: ControllableScheduler;
  /** Returns `true` if either endpoint or the shared scheduler holds pending work. */
  hasPendingWork(): boolean;
  /** Closes both endpoints and disposes an owned scheduler. */
  dispose(): void;
}

/** Options for {@link createPairedFakeTransport}. */
export interface CreatePairedFakeTransportOptions<
  SupportsTransfer extends boolean = false,
> {
  readonly peerA?: PeerAddress;
  readonly peerB?: PeerAddress;
  readonly supportsTransfer?: SupportsTransfer;
  readonly guaranteesRequestBeforeCancel?: boolean;
  readonly supportsOrderedStreams?: boolean;
  readonly initialDeliveryMode?: FakeDeliveryMode;
  readonly initialSendSettlementMode?: FakeSendSettlementMode;
  readonly scheduler?: ControllableScheduler;
}

interface EndpointInternals<
  Wire,
  PostOptions,
  TransferResource,
  SupportsTransfer extends boolean,
> extends FakeTransportEndpoint<Wire, PostOptions, TransferResource, SupportsTransfer> {
  deliverFromPeer(from: PeerAddress, payload: unknown): void;
}

/**
 * Creates a paired fake transport supporting synchronous delivery, delayed
 * scheduler-driven sends, manual queuing, independent send-Promise settlement,
 * synchronous throws, pre/post-delivery rejections, disconnection, and
 * stale/wrong-peer message injection.
 */
export function createPairedFakeTransport<
  Wire = unknown,
  PostOptions = undefined,
  TransferResource = never,
  SupportsTransfer extends boolean = false,
>(
  options: CreatePairedFakeTransportOptions<SupportsTransfer> = {},
): PairedFakeTransport<Wire, PostOptions, TransferResource, SupportsTransfer> {
  const ownsScheduler = options.scheduler === undefined;
  const scheduler = options.scheduler ?? createControllableScheduler();
  const peerA = options.peerA ?? { peerId: "peer-a", instanceId: "inst-a-1" };
  const peerB = options.peerB ?? { peerId: "peer-b", instanceId: "inst-b-1" };
  const capabilities: TransportCapabilities<SupportsTransfer> = {
    supportsTransfer: (options.supportsTransfer ?? false) as SupportsTransfer,
    guaranteesRequestBeforeCancel: options.guaranteesRequestBeforeCancel ?? true,
    supportsOrderedStreams: options.supportsOrderedStreams ?? true,
  };
  const initialMode: FakeDeliveryMode = options.initialDeliveryMode ?? { kind: "sync" };
  const initialSettlement: FakeSendSettlementMode =
    options.initialSendSettlementMode ?? "immediate";

  let endpointA!: EndpointInternals<Wire, PostOptions, TransferResource, SupportsTransfer>;
  let endpointB!: EndpointInternals<Wire, PostOptions, TransferResource, SupportsTransfer>;

  function createEndpoint(
    localPeer: PeerAddress,
    remotePeer: PeerAddress,
    getCounterparty: () => EndpointInternals<
      Wire,
      PostOptions,
      TransferResource,
      SupportsTransfer
    >,
  ): EndpointInternals<Wire, PostOptions, TransferResource, SupportsTransfer> {
    const listeners = new Set<(from: PeerAddress, payload: unknown) => void>();
    const sentMessages: FakeSentMessage<Wire, PostOptions, TransferResource>[] = [];
    const manualQueue: Array<() => void> = [];
    const scheduledCancellers = new Set<() => void>();
    const pendingSends: PendingSendEntry[] = [];
    const faultQueue: FakeSendFault[] = [];
    let mode: FakeDeliveryMode = initialMode;
    let settlementMode: FakeSendSettlementMode = initialSettlement;
    let isDisconnected = false;
    let disconnectError: Error = new Error(`Fake transport for ${localPeer.peerId} is disconnected.`);

    function settlePendingSend(entry: PendingSendEntry, error?: unknown, hasError = false): void {
      if (entry.settled) return;
      entry.settled = true;
      const index = pendingSends.indexOf(entry);
      if (index !== -1) {
        pendingSends.splice(index, 1);
      }
      if (hasError) {
        entry.reject(error);
      } else {
        entry.resolve();
      }
    }

    function clearPendingOutbound(error: Error): void {
      manualQueue.length = 0;
      faultQueue.length = 0;
      for (const cancel of scheduledCancellers) {
        cancel();
      }
      scheduledCancellers.clear();
      for (const entry of [...pendingSends]) {
        settlePendingSend(entry, error, true);
      }
    }

    function deliverToCounterparty(payload: unknown): void {
      if (isDisconnected) return;
      getCounterparty().deliverFromPeer(localPeer, payload);
    }

    return {
      localPeer,
      remotePeer,
      capabilities,
      sentMessages,
      get listenerCount(): number {
        return listeners.size;
      },
      get pendingDeliveryCount(): number {
        return manualQueue.length + scheduledCancellers.size;
      },
      get pendingSendCount(): number {
        return pendingSends.length;
      },
      get disconnected(): boolean {
        return isDisconnected;
      },
      setDeliveryMode(nextMode: FakeDeliveryMode): void {
        mode = nextMode;
      },
      setSendSettlementMode(nextMode: FakeSendSettlementMode): void {
        settlementMode = nextMode;
      },
      queueNextSendFault(fault: FakeSendFault): void {
        faultQueue.push(fault);
      },
      resolveNextSend(): boolean {
        const entry = pendingSends.shift();
        if (!entry) return false;
        entry.settled = true;
        entry.resolve();
        return true;
      },
      rejectNextSend(error: unknown): boolean {
        const entry = pendingSends.shift();
        if (!entry) return false;
        entry.settled = true;
        entry.reject(error);
        return true;
      },
      resolveAllSends(): number {
        let count = 0;
        while (this.resolveNextSend()) {
          count++;
        }
        return count;
      },
      send(
        target: PeerAddress,
        payload: Wire,
        postOptions?: PostOptions,
        transfer?: readonly TransferResource[],
      ): void | Promise<void> {
        if (isDisconnected) {
          return Promise.reject(disconnectError);
        }
        const fault = faultQueue.shift();
        if (fault?.kind === "throw") {
          throw fault.error;
        }
        if (fault?.kind === "reject-before-delivery") {
          return Promise.reject(fault.error);
        }

        sentMessages.push({
          target,
          payload,
          options: postOptions,
          transfer,
        });

        const capturedSettlementMode = settlementMode;
        const shouldTrackPromise =
          capturedSettlementMode !== "immediate" ||
          (fault?.kind === "reject-after-delivery" && mode.kind !== "sync");

        let pendingEntry: PendingSendEntry | undefined;
        let sendPromise: Promise<void> | undefined;
        if (shouldTrackPromise) {
          let resolve!: () => void;
          let reject!: (err: unknown) => void;
          sendPromise = new Promise<void>((res, rej) => {
            resolve = res;
            reject = rej;
          });
          pendingEntry = {
            settled: false,
            delivered: false,
            resolve,
            reject,
          };
          pendingSends.push(pendingEntry);
        }

        const dispatch = () => {
          deliverToCounterparty(payload);
          if (pendingEntry !== undefined) {
            pendingEntry.delivered = true;
            if (fault?.kind === "reject-after-delivery") {
              settlePendingSend(pendingEntry, fault.error, true);
            } else if (capturedSettlementMode === "after-delivery") {
              settlePendingSend(pendingEntry);
            }
          }
        };

        if (mode.kind === "sync") {
          dispatch();
          if (fault?.kind === "reject-after-delivery") {
            return sendPromise ?? Promise.reject(fault.error);
          }
          return sendPromise;
        }

        if (mode.kind === "manual") {
          manualQueue.push(dispatch);
        } else {
          let cancelRef: (() => void) | undefined;
          const run = () => {
            if (cancelRef !== undefined) {
              scheduledCancellers.delete(cancelRef);
            }
            dispatch();
          };
          cancelRef = scheduler.setTimeout(run, mode.delayMs);
          scheduledCancellers.add(cancelRef);
        }

        return sendPromise;
      },
      subscribe(listener: (from: PeerAddress, payload: unknown) => void): () => void {
        if (isDisconnected) {
          return () => undefined;
        }
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      deliverFromPeer(from: PeerAddress, payload: unknown): void {
        if (isDisconnected) return;
        for (const listener of [...listeners]) {
          listener(from, payload);
        }
      },
      injectInbound(from: PeerAddress, payload: unknown): void {
        if (isDisconnected) return;
        for (const listener of [...listeners]) {
          listener(from, payload);
        }
      },
      flushNext(): boolean {
        const next = manualQueue.shift();
        if (!next) return false;
        next();
        return true;
      },
      flushAll(): number {
        let count = 0;
        while (this.flushNext()) {
          count++;
        }
        return count;
      },
      disconnect(reason?: Error): void {
        if (isDisconnected) return;
        isDisconnected = true;
        if (reason !== undefined) {
          disconnectError = reason;
        }
        clearPendingOutbound(disconnectError);
        listeners.clear();
      },
      close(): void {
        this.disconnect();
      },
      hasPendingWork(): boolean {
        return (
          listeners.size > 0 ||
          manualQueue.length > 0 ||
          scheduledCancellers.size > 0 ||
          pendingSends.length > 0 ||
          faultQueue.length > 0
        );
      },
    };
  }

  endpointA = createEndpoint(peerA, peerB, () => endpointB);
  endpointB = createEndpoint(peerB, peerA, () => endpointA);

  return {
    a: endpointA,
    b: endpointB,
    scheduler,
    hasPendingWork(): boolean {
      return (
        endpointA.hasPendingWork() ||
        endpointB.hasPendingWork() ||
        scheduler.pendingCount > 0
      );
    },
    dispose(): void {
      endpointA.close();
      endpointB.close();
      if (ownsScheduler) {
        scheduler.dispose();
      }
    },
  };
}
