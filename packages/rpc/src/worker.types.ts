import type { PeerAddress } from "./types.js";

/** Minimal structural message event compatible with `MessagePort` and `Worker`. */
export interface MessageEventLike<T = unknown> {
  readonly data: T;
}

/**
 * Minimal structural port/worker endpoint accepted by the Worker transport
 * adapter, compatible with browser `MessagePort`, `Worker`, Worker `self`, and
 * adapted Node `MessagePort` instances.
 */
export interface MessagePortLike<TransferResource = ArrayBuffer> {
  postMessage(message: unknown, transfer: TransferResource[]): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEventLike<unknown>) => void,
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: MessageEventLike<unknown>) => void,
  ): void;
  start?(): void;
  close?(): void | Promise<unknown>;
  terminate?(): void | Promise<unknown>;
}

/**
 * Minimal DOM-free structural interface matching transferable platform
 * `MessagePort` instances in both browser and Node.js environments while
 * excluding `Worker` and `BroadcastChannel`.
 */
export interface WorkerTransferPort {
  postMessage(message: unknown): void;
  start(): void;
  close(): void;
}

/** Supported payload profiles for transfer-bearing Worker sends. */
export type WorkerTransferProfile = "binary-data" | "binary-data-and-ports";

/** Resource types permitted by {@link Profile}. */
export type WorkerTransferResource<
  Profile extends WorkerTransferProfile = "binary-data",
> = Profile extends "binary-data-and-ports"
  ? ArrayBuffer | WorkerTransferPort
  : ArrayBuffer;

/** Primitive values accepted inside the Worker `binary-data` transfer profile. */
export type WorkerTransferPrimitive =
  undefined | null | boolean | number | string | bigint;

/** Ordinary platform binary leaves accepted inside `binary-data`. */
export type WorkerBinaryLeaf =
  | ArrayBuffer
  | DataView
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

/**
 * Structural data shape accepted on transfer-bearing Worker sends under the
 * `binary-data` profile, optionally parameterised by a supported opaque
 * extension such as {@link WorkerTransferPort}.
 *
 * Copy-only methods and custom codec inputs are not constrained to this shape.
 * Structural assignment alone does not prove the absence of Proxy wrappers,
 * accessors, custom prototypes, or mutation during posting.
 */
export type WorkerTransferData<Extra = never> =
  | WorkerTransferPrimitive
  | WorkerBinaryLeaf
  | Extra
  | readonly WorkerTransferData<Extra>[]
  | { readonly [key: string]: WorkerTransferData<Extra> };

/**
 * Transport-specific sending options for the Worker / MessagePort profile.
 *
 * Ownership transfer is declared via `withTransfer(value, resources)` rather
 * than bypassing method contracts with a raw transfer array in `postOptions`.
 */
export interface WorkerPostOptions {
  /** Optional diagnostic tag attached locally by the caller. */
  readonly traceLabel?: string;
}

/** Configuration for binding one `MessagePort` or `Worker` endpoint. */
export interface CreateMessagePortTransportOptions<
  Profile extends WorkerTransferProfile = "binary-data",
> {
  /** Target port or Worker instance. */
  readonly port: MessagePortLike<never>;
  /** Remote peer address assigned by the host for this port. */
  readonly remotePeer: PeerAddress;
  /** Whether endpoint teardown also closes or terminates the port. */
  readonly portOwnership?: "owned" | "borrowed";
  /** Ownership-transfer data profile enforced on non-empty transfer sends. */
  readonly transferProfile?: Profile | undefined;
}

/** Options accepted by {@link assertReachableTransferables}. */
export interface WorkerReachabilityOptions<
  Profile extends WorkerTransferProfile = "binary-data",
> {
  /** Ownership-transfer data profile enforced on non-empty transfer sends. */
  readonly transferProfile?: Profile | undefined;
}
