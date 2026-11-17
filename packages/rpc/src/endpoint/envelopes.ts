import { RpcError, type RpcErrorCode } from "../RpcError.js";
import type { RpcSerializedError } from "../errors.js";
import { isWithTransfer, type TransferRequirement } from "../transfer.js";
import type { PeerAddress, RpcEnvelope } from "../types.js";

/** Unwrapped payload values and extracted transfer resources. */
export interface UnwrappedPayload {
  readonly values: unknown[];
  readonly transfer: unknown[];
}

/** Unwrapped single return value and extracted transfer resources. */
export interface UnwrappedResult {
  readonly value: unknown;
  readonly transfer: unknown[];
}

/** Returns a collision-free map key for a `(peerId, instanceId)` pair. */
export function peerAddressKey(peer: PeerAddress): string {
  return JSON.stringify([peer.peerId, peer.instanceId]);
}

/**
 * Reads `peerId` and `instanceId` once from a host-supplied peer address,
 * validates that both are non-empty strings, and returns a frozen plain copy.
 */
export function snapshotPeerAddress(
  candidate: unknown,
  message = "PeerAddress must have non-empty string peerId and instanceId.",
): PeerAddress {
  if (typeof candidate !== "object" || candidate === null) {
    throw new RpcError("invalid-contract", message);
  }
  const record = candidate as Record<string, unknown>;
  const peerId = record.peerId;
  const instanceId = record.instanceId;
  if (
    typeof peerId !== "string" ||
    peerId.length === 0 ||
    typeof instanceId !== "string" ||
    instanceId.length === 0
  ) {
    throw new RpcError("invalid-contract", message);
  }
  return Object.freeze({ peerId, instanceId });
}

/** Validates that a candidate value is a non-empty {@link PeerAddress}. */
export function isValidPeerAddress(
  candidate: unknown,
): candidate is PeerAddress {
  if (typeof candidate !== "object" || candidate === null) return false;
  const record = candidate as Record<string, unknown>;
  return (
    typeof record.peerId === "string" &&
    record.peerId.length > 0 &&
    typeof record.instanceId === "string" &&
    record.instanceId.length > 0
  );
}

/** Returns `true` when both addresses match on `peerId` and `instanceId`. */
export function peersEqual(a: PeerAddress, b: PeerAddress): boolean {
  return a.peerId === b.peerId && a.instanceId === b.instanceId;
}

/** Validates a serialised wire error payload. */
export function isValidSerializedError(
  candidate: unknown,
): candidate is RpcSerializedError {
  if (typeof candidate !== "object" || candidate === null) return false;
  const record = candidate as Record<string, unknown>;
  return (
    typeof record.code === "string" &&
    typeof record.message === "string" &&
    (record.remoteName === undefined || typeof record.remoteName === "string")
  );
}

/** Validates an inbound decoded envelope against transport sender and local peer. */
export function isValidEnvelope(
  candidate: unknown,
  transportSender: PeerAddress,
  localPeer: PeerAddress,
): candidate is RpcEnvelope {
  if (typeof candidate !== "object" || candidate === null) return false;
  const env = candidate as Record<string, unknown>;
  return (
    matchesEnvelopeRoute(env, transportSender, localPeer) &&
    hasEnvelopePayload(env)
  );
}

function matchesEnvelopeRoute(
  env: Record<string, unknown>,
  transportSender: PeerAddress,
  localPeer: PeerAddress,
): boolean {
  if (env.version !== 1) return false;
  if (
    !isValidPeerAddress(env.sender) ||
    !peersEqual(env.sender, transportSender)
  ) {
    return false;
  }
  if (env.target !== undefined) {
    if (!isValidPeerAddress(env.target) || !peersEqual(env.target, localPeer)) {
      return false;
    }
  }
  return true;
}

function hasEnvelopePayload(env: Record<string, unknown>): boolean {
  switch (env.kind) {
    case "request":
      return (
        typeof env.requestId === "string" &&
        env.requestId.length > 0 &&
        typeof env.method === "string" &&
        Array.isArray(env.args)
      );
    case "notify":
      return typeof env.method === "string" && Array.isArray(env.args);
    case "response":
      return hasResponsePayload(env);
    case "cancel":
      return (
        typeof env.requestId === "string" &&
        env.requestId.length > 0 &&
        (env.reason === undefined || isValidSerializedError(env.reason))
      );
    default:
      return false;
  }
}

function hasResponsePayload(env: Record<string, unknown>): boolean {
  if (typeof env.requestId !== "string" || env.requestId.length === 0)
    return false;
  if (env.ok === true) return true;
  if (env.ok === false) return isValidSerializedError(env.error);
  return false;
}

/** Normalises an unknown thrown value into an {@link RpcError}. */
export function toRpcError(
  code: RpcErrorCode,
  error: unknown,
  peer?: PeerAddress,
): RpcError {
  if (error instanceof RpcError) return error;
  const message =
    error instanceof Error && error.message.length > 0
      ? error.message
      : `RPC operation failed (${code}).`;
  return new RpcError(code, message, {
    ...(peer !== undefined ? { peer } : {}),
    cause: error,
  });
}

/** Returns `true` for Promise-like values. */
export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

/** Unwraps `withTransfer()` descriptors from outbound call or notify arguments. */
export function prepareOutboundArgs(
  rawArgs: readonly unknown[],
  requirement: TransferRequirement,
  supportsTransfer: boolean,
  peer?: PeerAddress,
): UnwrappedPayload {
  const values: unknown[] = [];
  const transfer: unknown[] = [];
  let sawWrapper = false;

  for (const item of rawArgs) {
    if (isWithTransfer(item)) {
      assertArgumentTransferAllowed(requirement, peer);
      sawWrapper = true;
      values.push(item.value);
      for (const resource of item.resources) {
        transfer.push(resource);
      }
    } else {
      values.push(item);
    }
  }

  assertArgumentTransferSatisfied(
    requirement,
    sawWrapper,
    transfer.length,
    supportsTransfer,
    peer,
  );

  return { values, transfer };
}

function assertArgumentTransferAllowed(
  requirement: TransferRequirement,
  peer?: PeerAddress,
): void {
  if (requirement === "none") {
    throw new RpcError(
      "invalid-contract",
      "Ownership transfer wrapper is not allowed for copy-only arguments.",
      peer !== undefined ? { peer } : undefined,
    );
  }
}

function assertArgumentTransferSatisfied(
  requirement: TransferRequirement,
  sawWrapper: boolean,
  resourceCount: number,
  supportsTransfer: boolean,
  peer?: PeerAddress,
): void {
  if (requirement === "required" && (!sawWrapper || resourceCount === 0)) {
    throw new RpcError(
      "transfer-failed",
      "Required ownership transfer arguments must include at least one non-empty withTransfer() descriptor.",
      peer !== undefined ? { peer } : undefined,
    );
  }
  if (resourceCount > 0 && !supportsTransfer) {
    throw new RpcError(
      "transfer-failed",
      "Transport does not support ownership transfer.",
      peer !== undefined ? { peer } : undefined,
    );
  }
}

/** Unwraps `withTransfer()` descriptors from a handler return value. */
export function prepareOutboundResult(
  rawResult: unknown,
  requirement: TransferRequirement,
  supportsTransfer: boolean,
  peer: PeerAddress,
): UnwrappedResult {
  if (isWithTransfer(rawResult)) {
    if (requirement === "none") {
      throw new RpcError(
        "invalid-contract",
        "Ownership transfer wrapper is not allowed for copy-only results.",
        { peer },
      );
    }
    if (requirement === "required" && rawResult.resources.length === 0) {
      throw new RpcError(
        "transfer-failed",
        "Required result ownership transfer descriptor must specify at least one resource.",
        { peer },
      );
    }
    if (rawResult.resources.length > 0 && !supportsTransfer) {
      throw new RpcError(
        "transfer-failed",
        "Transport does not support ownership transfer.",
        { peer },
      );
    }
    return {
      value: rawResult.value,
      transfer: [...rawResult.resources],
    };
  }

  if (requirement === "required") {
    throw new RpcError(
      "transfer-failed",
      "Handler result must be wrapped with withTransfer() when result transfer is required.",
      { peer },
    );
  }

  return {
    value: rawResult,
    transfer: [],
  };
}
