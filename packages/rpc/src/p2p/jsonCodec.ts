import type { Codec } from "../service/contracts.js";
import type { RpcEnvelope } from "./types.js";
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}
function isRequest(value: Record<string, unknown>): boolean {
  return (
    typeof value.method === "string" &&
    Array.isArray(value.args) &&
    (value.expectsResponse === undefined || value.expectsResponse === false)
  );
}
function isResponse(value: Record<string, unknown>): boolean {
  if (value.ok === true) {
    return true;
  }
  return (
    value.ok === false &&
    isRecord(value.error) &&
    typeof value.error.code === "string" &&
    typeof value.error.message === "string"
  );
}
function isEnvelope(value: unknown): value is RpcEnvelope {
  if (!isRecord(value)) {
    return false;
  }
  if (value.kind === "handshake") {
    return (
      typeof value.versionMajor === "number" &&
      typeof value.versionMinor === "number"
    );
  }
  if (typeof value.requestId !== "string") {
    return false;
  }
  switch (value.kind) {
    case "cancel":
      return true;
    case "request":
      return isRequest(value);
    case "response":
      return isResponse(value);
    default:
      return false;
  }
}
/** JSON representation for the existing P2P envelope. */
export function createJsonCodec(): Codec<RpcEnvelope, string> {
  return {
    encode: (envelope) => JSON.stringify(envelope),
    decode(payload) {
      if (typeof payload !== "string") {
        throw new TypeError("Expected JSON string");
      }
      const value: unknown = JSON.parse(payload);
      if (!isEnvelope(value)) {
        throw new TypeError("Invalid RPC envelope");
      }
      return value;
    },
  };
}
