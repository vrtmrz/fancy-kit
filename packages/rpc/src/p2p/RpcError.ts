import type { JsonLike, RpcErrorCode, RpcErrorShape } from "./types.js";
/** Error preserving the existing P2P code/message/details contract. */
export class RpcError extends Error {
  /** Legacy error category. */
  readonly code: RpcErrorCode;
  /** Optional JSON application metadata. */
  readonly details: JsonLike | undefined;
  /** Constructs a local or decoded legacy error. */
  constructor(code: RpcErrorCode, message: string, details?: JsonLike) {
    super(message);
    this.name = "RpcError";
    this.code = code;
    this.details = details;
  }
  /** Returns the encodable legacy error shape. */
  toShape(): RpcErrorShape {
    return this.details === undefined
      ? { code: this.code, message: this.message }
      : { code: this.code, message: this.message, details: this.details };
  }
}
/** Converts handler failures without forwarding arbitrary exception properties. */
export function asRpcErrorShape(error: unknown): RpcErrorShape {
  if (error instanceof RpcError) {
    return error.toShape();
  }
  return {
    code: "REMOTE_ERROR",
    message: error instanceof Error ? error.message : "Unknown remote error",
  };
}
