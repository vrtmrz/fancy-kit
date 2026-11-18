import { RpcError } from "./RpcError.js";
import { snapshotPeerAddress } from "./endpoint/envelopes.js";
import type {
  PeerAddress,
  RpcCodec,
  RpcEnvelope,
  RpcTransport,
} from "./types.js";
import {
  assertReachableTransferablesInternal,
  resolveTransferProfile,
} from "./worker.transfer.js";
import type {
  CreateMessagePortTransportOptions,
  MessageEventLike,
  MessagePortLike,
  WorkerPostOptions,
  WorkerTransferPort,
  WorkerTransferProfile,
} from "./worker.types.js";

/**
 * Pass-through codec for structured-clone transports such as `MessagePort`.
 *
 * Performs no preliminary `structuredClone` or JSON round trip; validates
 * envelope shapes on `decode` and leaves transfer detachment to `postMessage`.
 */
export function createIdentityCodec<Envelope = RpcEnvelope>(): RpcCodec<
  Envelope,
  Envelope
> {
  return {
    encode(envelope: Envelope): Envelope {
      return envelope;
    },
    decode(input: unknown): Envelope {
      if (typeof input !== "object" || input === null) {
        throw new RpcError(
          "decode-failed",
          "Expected structured RPC envelope object.",
        );
      }
      return input as Envelope;
    },
  };
}

/**
 * Creates a transfer-capable transport over a `MessagePort` or `Worker`.
 *
 * Starts the port when `port.start` is present upon subscription and removes
 * listeners on unsubscribe/close. Default sends with non-empty transfer lists
 * enforce `"binary-data"`; set `transferProfile: "binary-data-and-ports"` to
 * enable `MessagePort` forwarding.
 */
export function createMessagePortTransport(
  options: CreateMessagePortTransportOptions<"binary-data">,
): RpcTransport<unknown, WorkerPostOptions, ArrayBuffer, true>;
export function createMessagePortTransport(
  options: CreateMessagePortTransportOptions<"binary-data-and-ports"> & {
    readonly transferProfile: "binary-data-and-ports";
  },
): RpcTransport<
  unknown,
  WorkerPostOptions,
  ArrayBuffer | WorkerTransferPort,
  true
>;
export function createMessagePortTransport(
  options: CreateMessagePortTransportOptions<WorkerTransferProfile>,
): RpcTransport<
  unknown,
  WorkerPostOptions,
  ArrayBuffer | WorkerTransferPort,
  true
> {
  const { port, portOwnership = "borrowed" } = options;
  const profile = resolveTransferProfile(options.transferProfile);
  const remotePeer = snapshotPeerAddress(
    options.remotePeer,
    "MessagePort transport requires a valid remotePeer address.",
  );
  let closed = false;
  const activeListeners = new Set<(event: MessageEventLike<unknown>) => void>();

  return {
    capabilities: {
      supportsTransfer: true,
      guaranteesRequestBeforeCancel: true,
      supportsOrderedStreams: true,
    },
    send(
      target: PeerAddress,
      payload: unknown,
      _postOptions?: WorkerPostOptions,
      transfer?: readonly (ArrayBuffer | WorkerTransferPort)[],
    ): void {
      if (closed) {
        throw new RpcError("disconnected", "MessagePort transport is closed.", {
          peer: target,
        });
      }
      if (
        target.peerId !== remotePeer.peerId ||
        target.instanceId !== remotePeer.instanceId
      ) {
        throw new RpcError(
          "disconnected",
          "Target peer does not match this MessagePort transport.",
          { peer: target },
        );
      }

      const transferList =
        transfer && transfer.length > 0
          ? [
              ...assertReachableTransferablesInternal(
                payload,
                transfer,
                profile,
              ),
            ]
          : [];

      try {
        (port as MessagePortLike<unknown>).postMessage(payload, transferList);
      } catch (error) {
        if (error instanceof RpcError) {
          throw error;
        }
        const code =
          transferList.length > 0 ? "transfer-failed" : "send-failed";
        throw new RpcError(
          code,
          error instanceof Error && error.message.length > 0
            ? error.message
            : "MessagePort.postMessage failed.",
          { peer: target, cause: error },
        );
      }
    },
    subscribe(
      handler: (from: PeerAddress, payload: unknown) => void,
    ): () => void {
      if (closed) {
        return () => undefined;
      }
      let subscribed = true;
      const onMessage = (event: MessageEventLike<unknown>) => {
        if (closed || !subscribed) {
          return;
        }
        handler(remotePeer, event.data);
      };
      activeListeners.add(onMessage);
      port.addEventListener("message", onMessage);
      try {
        port.start?.();
      } catch (error) {
        subscribed = false;
        try {
          port.removeEventListener("message", onMessage);
          activeListeners.delete(onMessage);
        } catch {
          // Keep tracking the listener so close() can retry its removal.
        }
        throw error;
      }
      return () => {
        subscribed = false;
        activeListeners.delete(onMessage);
        port.removeEventListener("message", onMessage);
      };
    },
    close(): void | Promise<void> {
      if (closed) return;
      closed = true;
      for (const listener of [...activeListeners]) {
        port.removeEventListener("message", listener);
      }
      activeListeners.clear();
      if (portOwnership !== "owned") {
        return;
      }
      const pending: Array<Promise<unknown>> = [];
      const collectResult = (result: unknown) => {
        if (
          (typeof result === "object" || typeof result === "function") &&
          result !== null &&
          typeof (result as { readonly then?: unknown }).then === "function"
        ) {
          pending.push(Promise.resolve(result));
        }
      };
      if (port.close) {
        collectResult(port.close());
      }
      if (port.terminate) {
        collectResult(port.terminate());
      }
      if (pending.length > 0) {
        return Promise.all(pending).then(() => undefined);
      }
      return;
    },
  };
}
