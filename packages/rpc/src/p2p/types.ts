import type {
  CallOptions,
  CancellationSignal,
  Codec,
  JsonValue,
  RegisterOptions,
  RequestContext,
  Runtime,
  Transport,
} from "../service/contracts.js";
/** Legacy RPC major version. */
export const RPC_VERSION_MAJOR = 1;
/** Legacy RPC minor version. */
export const RPC_VERSION_MINOR = 0;
/** JSON values on the existing P2P protocol. */
export type JsonLike = JsonValue;
/** Existing caller-visible error codes. */
export type RpcErrorCode =
  "TIMEOUT" | "NOT_CONNECTED" | "REMOTE_ERROR" | "CANCELLED" | "PROTOCOL_ERROR";
/** Wire-safe legacy error, including optional application detail. */
export interface RpcErrorShape {
  /** Stable legacy category. */
  code: RpcErrorCode;
  /** Error description. */
  message: string;
  /** Optional JSON application metadata. */
  details?: JsonLike;
}
/** Call deadline and cooperative cancellation options. */
export type RpcCallOptions = CallOptions;
/** Handler-local cancellation context. */
export type RpcRequestContext<
  S extends CancellationSignal = CancellationSignal,
> = RequestContext<S>;
/** Existing per-method serial execution option. */
export type RpcRegisterOptions = RegisterOptions;
/** Existing response-bearing request, or notification when expectsResponse is false. */
export type RpcRequestEnvelope = {
  kind: "request";
  requestId: string;
  method: string;
  args: JsonLike[];
  /** Omit for a response-bearing call; set false for a send-only notification. */
  expectsResponse?: false;
};

/** Successful reply; a void result may omit data after JSON encoding. */
export type RpcResponseEnvelope = {
  kind: "response";
  requestId: string;
  ok: true;
  data: JsonLike;
};

/** Failed reply retaining the legacy structured error. */
export type RpcResponseErrorEnvelope = {
  kind: "response";
  requestId: string;
  ok: false;
  error: RpcErrorShape;
};

/** Cooperative cancellation correlated with a peer and request ID. */
export type RpcCancelEnvelope = {
  kind: "cancel";
  requestId: string;
};

/** Legacy version announcement, without a mandatory readiness round trip. */
export type RpcHandshakeEnvelope = {
  kind: "handshake";
  versionMajor: number;
  versionMinor: number;
};

/** Logical legacy envelope, encoded before physical framing. */
export type RpcEnvelope =
  | RpcRequestEnvelope
  | RpcResponseEnvelope
  | RpcResponseErrorEnvelope
  | RpcCancelEnvelope
  | RpcHandshakeEnvelope;

/** Complete encoded logical envelope. */
export type RpcWireMessageRaw = {
  wire: "raw";
  payload: string;
};

/** One fragment in the legacy string framing protocol. */
export type RpcWireMessageChunk = {
  wire: "chunk";
  streamId: string;
  index: number;
  total: number;
  payload: string;
};

/** Empty missing list acknowledges completion; otherwise requests retransmission. */
export type RpcWireMessageChunkAck = {
  wire: "chunk-ack";
  streamId: string;
  missing: number[];
};

/** Physical legacy protocol accepted by the borrowed transport. */
export type RpcWireMessage =
  RpcWireMessageRaw | RpcWireMessageChunk | RpcWireMessageChunkAck;

/** Physical legacy transport; the host owns its connection. */
export type TransportAdapter<PostOptions = undefined> = Transport<
  RpcWireMessage,
  PostOptions
>;
/** Host cancellation controller; native AbortController satisfies this interface. */
export interface RpcAbortController<
  S extends CancellationSignal = CancellationSignal,
> {
  /** Per-invocation cancellation signal. */
  readonly signal: S;
  /** Cooperatively requests cancellation. */
  abort(reason?: unknown): void;
}
/** Options for the JSON/framing P2P composition. */
export interface RpcRoomOptions<
  S extends CancellationSignal = CancellationSignal,
  PostOptions = undefined,
> {
  /** Borrowed physical connection. */
  transport: TransportAdapter<PostOptions>;
  /** Envelope codec. Defaults to validated JSON; framing consumes strings. */
  codec?: Codec<RpcEnvelope, string>;
  /** Local transport options used for every physical send in this room. */
  postOptions?: PostOptions;
  /** Maximum UTF-8 chunk payload, default 32 KiB. */
  maxWirePayloadBytes?: number;
  /** Quiet-period delay before requesting missing chunks, default 350 ms. */
  chunkMissingRetryMs?: number;
  /** Timer and ID overrides for deterministic hosts and tests. */
  runtime?: Partial<Runtime>;
  /** Defaults to the host's native AbortController, resolved lazily per request. */
  createAbortController?: () => RpcAbortController<S>;
  /** Creates context before awaiting admission. False deliberately sends no reply. */
  canAcceptRequest?: (
    peerId: string,
    method: string,
    context: RpcRequestContext<S>,
  ) => boolean | Promise<boolean>;
  /** Receives protocol, handler, and transport warnings. Throws and rejected observer promises are isolated. */
  onProtocolWarning?: (message: string, peerId?: string) => void;
}
/** Handler without cancellation context. */
export type RpcMethodHandler<T extends JsonLike[], U> = (
  peerId: string,
  ...args: T
) => U | Promise<U>;
/** Handler which may pass its signal to cancellable work. */
export type RpcCancellationAwareMethodHandler<
  T extends JsonLike[],
  U,
  S extends CancellationSignal = CancellationSignal,
> = (
  context: RpcRequestContext<S>,
  peerId: string,
  ...args: T
) => U | Promise<U>;
