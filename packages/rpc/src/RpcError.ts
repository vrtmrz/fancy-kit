import type { PeerAddress } from "./types.js";

/** Structured RPC failure categories stable across profiles. */
export type RpcErrorCode =
  | "timeout"
  | "aborted"
  | "disconnected"
  | "encode-failed"
  | "decode-failed"
  | "transfer-failed"
  | "unsupported-profile"
  | "method-not-found"
  | "invalid-contract"
  | "invalid-envelope"
  | "stream-protocol-error"
  | "send-failed"
  | "remote-error"
  | "internal-error";

/** Options accepted by {@link RpcError}. */
export interface RpcErrorOptions {
  /** Remote peer associated with the failure, when known. */
  readonly peer?: PeerAddress;
  /** Original remote error class name when `code` is `"remote-error"`. */
  readonly remoteName?: string;
  /** Underlying local cause retained outside wire serialisation. */
  readonly cause?: unknown;
}

/** Structured error thrown or returned across all `@vrtmrz/rpc` operations. */
export class RpcError extends Error {
  /** Structured failure category. */
  readonly code: RpcErrorCode;
  /** Optional peer associated with the failure. */
  readonly peer?: PeerAddress;
  /** Optional remote error class name when `code === "remote-error"`. */
  readonly remoteName?: string;

  /**
   * Creates an {@link RpcError}.
   *
   * @param code - Structured failure category.
   * @param message - Safe diagnostic summary.
   * @param options - Optional peer, remote name, and local cause metadata.
   */
  constructor(code: RpcErrorCode, message: string, options?: RpcErrorOptions) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "RpcError";
    this.code = code;
    if (options?.peer !== undefined) {
      this.peer = options.peer;
    }
    if (options?.remoteName !== undefined) {
      this.remoteName = options.remoteName;
    }
  }
}
