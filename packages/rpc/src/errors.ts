import { RpcError, type RpcErrorCode } from "./RpcError.js";

/** Encodable wire representation of a remote or local RPC error. */
export interface RpcSerializedError {
  /** Structured RPC error code. */
  readonly code: RpcErrorCode;
  /** Safe summary message without unredacted payloads or credentials. */
  readonly message: string;
  /** Optional remote exception name when `code` is `"remote-error"`. */
  readonly remoteName?: string;
}

/**
 * Converts an arbitrary error value into an encodable {@link RpcSerializedError}.
 *
 * Avoids forwarding stack traces or arbitrary non-serialisable fields onto the
 * wire while preserving structured RPC codes and error names.
 *
 * @param error - Thrown or rejected value from a handler or boundary check.
 */
export function serialiseRpcError(error: unknown): RpcSerializedError {
  if (error instanceof RpcError) {
    return error.remoteName !== undefined
      ? { code: error.code, message: error.message, remoteName: error.remoteName }
      : { code: error.code, message: error.message };
  }
  if (error instanceof Error) {
    return {
      code: "remote-error",
      message: error.message || error.name || "Remote handler failed.",
      remoteName: error.name || "Error",
    };
  }
  return {
    code: "remote-error",
    message: typeof error === "string" && error.length > 0 ? error : "Remote handler failed.",
  };
}
