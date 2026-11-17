import { RpcError } from "./RpcError.js";
import type { RpcMethodDescriptor } from "./contracts.js";
import {
  peerAddressKey,
  prepareOutboundArgs,
  snapshotPeerAddress,
  toRpcError,
} from "./endpoint/envelopes.js";
import type {
  PeerAddress,
  PeerSendOutcome,
  RpcNotifyOptions,
  RpcTransport,
} from "./types.js";

interface NotifyManyContext<Wire, PostOptions> {
  isEndpointClosed: () => boolean;
  getDescriptor: (method: string) => RpcMethodDescriptor | undefined;
  supportsTransfer: boolean;
  encodeSharedNotify: (method: string, values: readonly unknown[]) => Wire;
  transport: Pick<RpcTransport<Wire, PostOptions>, "sendMany">;
  invokeNotify: (
    peer: PeerAddress,
    isDisposed: () => boolean,
    method: string,
    args: readonly unknown[],
    options?: RpcNotifyOptions<PostOptions>,
  ) => Promise<void>;
}

/** Sends a deduplicated peer snapshot through native multicast or individual notifications. */
export async function notifyMany<Wire, PostOptions>(
  context: NotifyManyContext<Wire, PostOptions>,
  targets: readonly PeerAddress[],
  method: string,
  args: readonly unknown[],
  notifyOptions?: RpcNotifyOptions<PostOptions>,
): Promise<readonly PeerSendOutcome[]> {
  const {
    isEndpointClosed,
    getDescriptor,
    supportsTransfer,
    encodeSharedNotify,
    transport,
  } = context;
  if (isEndpointClosed()) {
    throw new RpcError("disconnected", "RPC endpoint is closed.");
  }
  const descriptor = requireNotifiableMethod(getDescriptor(method), method);
  if (notifyOptions?.signal?.aborted) {
    throw new RpcError(
      "aborted",
      "Multi-peer notification aborted before sending.",
      {
        cause: notifyOptions.signal.reason,
      },
    );
  }

  const snapshotTargets = snapshotNotificationTargets(targets);
  if (snapshotTargets.length === 0) {
    return [];
  }

  const prepared = prepareOutboundArgs(
    args,
    descriptor.inputTransfer,
    supportsTransfer,
  );
  if (prepared.transfer.length > 0 && snapshotTargets.length > 1) {
    throw new RpcError(
      "transfer-failed",
      "Cannot transfer the same designated resources to multiple peers.",
    );
  }

  const sharedEncoded = encodeSharedNotify(method, prepared.values);

  if (transport.sendMany) {
    try {
      const result = await transport.sendMany(
        snapshotTargets,
        sharedEncoded,
        notifyOptions?.postOptions,
      );
      if (Array.isArray(result)) {
        return result;
      }
      return snapshotTargets.map((peer) => ({ peer, status: "sent" as const }));
    } catch (error) {
      const sendError = toRpcError("send-failed", error);
      return snapshotTargets.map((peer) => ({
        peer,
        status: "failed" as const,
        error: sendError,
      }));
    }
  }

  const attempts: Promise<PeerSendOutcome>[] = [];
  for (const peer of snapshotTargets) {
    attempts.push(
      sendIndividualNotification(context, peer, method, args, notifyOptions),
    );
  }
  return await Promise.all(attempts);
}

function snapshotNotificationTargets(
  targets: readonly PeerAddress[],
): PeerAddress[] {
  const seenKeys = new Set<string>();
  const snapshotTargets: PeerAddress[] = [];
  for (const target of targets) {
    const snapshotTarget = snapshotPeerAddress(
      target,
      "notifyMany received an invalid PeerAddress.",
    );
    const key = peerAddressKey(snapshotTarget);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      snapshotTargets.push(snapshotTarget);
    }
  }
  return snapshotTargets;
}

function isNeverDisposed(): boolean {
  return false;
}

async function sendIndividualNotification<Wire, PostOptions>(
  context: NotifyManyContext<Wire, PostOptions>,
  peer: PeerAddress,
  method: string,
  args: readonly unknown[],
  options?: RpcNotifyOptions<PostOptions>,
): Promise<PeerSendOutcome> {
  try {
    await context.invokeNotify(peer, isNeverDisposed, method, args, options);
    return { peer, status: "sent" };
  } catch (error) {
    return {
      peer,
      status: "failed",
      error: toRpcError("send-failed", error, peer),
    };
  }
}

function requireNotifiableMethod(
  descriptor: RpcMethodDescriptor | undefined,
  method: string,
): RpcMethodDescriptor {
  if (
    !descriptor ||
    (descriptor.kind !== "call" && descriptor.kind !== "notify")
  ) {
    throw new RpcError(
      "invalid-contract",
      `Method "${method}" does not accept notifications.`,
    );
  }
  if (descriptor.inputTransfer === "required") {
    throw new RpcError(
      "transfer-failed",
      `Method "${method}" requires ownership transfer and cannot target multiple peers in notifyMany.`,
    );
  }
  return descriptor;
}
