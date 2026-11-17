import type {
  CallableKeys,
  ContractRequiresTransfer,
  ContractShape,
  ContractUsesStreams,
  MultiNotifiableKeys,
  NotifiableKeys,
  RpcMethodDescriptor,
} from "./contracts.js";
import type { RpcError } from "./RpcError.js";
import type { RpcSerializedError } from "./errors.js";
import type {
  ClientArgs,
  HandlerResult,
  TransferRequirement,
  TupleContainsTransfer,
} from "./transfer.js";

/** A synchronous value or a promise-like asynchronous result. */
export type Awaitable<T> = T | PromiseLike<T>;

/**
 * A platform-neutral cancellation signal structurally compatible with standard
 * `AbortSignal` instances without requiring DOM or Node type libraries.
 */
export interface CancelSignal {
  /** Whether the signal has already been aborted. */
  readonly aborted: boolean;
  /** Optional cancellation reason supplied by the caller. */
  readonly reason?: unknown;
  /** Registers a listener invoked when cancellation occurs. */
  addEventListener(
    type: "abort",
    listener: () => void,
    options?: { readonly once?: boolean },
  ): void;
  /** Removes a previously registered cancellation listener. */
  removeEventListener(type: "abort", listener: () => void): void;
}

/** Identifies a remote peer and its specific connection incarnation. */
export interface PeerAddress {
  /** Logical peer identifier assigned by the host or profile. */
  readonly peerId: string;
  /** Unique incarnation identifier for the active connection instance. */
  readonly instanceId: string;
}

/** Per-target local sending outcome returned by `notifyMany`. */
export type PeerSendOutcome =
  | {
      /** Target peer and connection instance selected at invocation time. */
      readonly peer: PeerAddress;
      /** Local encoding and transport send succeeded. */
      readonly status: "sent";
    }
  | {
      /** Target peer and connection instance selected at invocation time. */
      readonly peer: PeerAddress;
      /** Local validation, encoding, or transport send failed. */
      readonly status: "failed";
      /** Structured failure describing why sending to this peer failed. */
      readonly error: RpcError;
    };

/** Protocol message envelopes passed between the RPC core and a `Codec`. */
export type RpcEnvelope =
  | {
      readonly kind: "request";
      readonly version: 1;
      readonly requestId: string;
      readonly sender: PeerAddress;
      readonly target?: PeerAddress;
      readonly method: string;
      readonly args: readonly unknown[];
    }
  | {
      readonly kind: "notify";
      readonly version: 1;
      readonly sender: PeerAddress;
      readonly target?: PeerAddress;
      readonly method: string;
      readonly args: readonly unknown[];
    }
  | {
      readonly kind: "response";
      readonly version: 1;
      readonly requestId: string;
      readonly sender: PeerAddress;
      readonly target?: PeerAddress;
      readonly ok: true;
      readonly result: unknown;
    }
  | {
      readonly kind: "response";
      readonly version: 1;
      readonly requestId: string;
      readonly sender: PeerAddress;
      readonly target?: PeerAddress;
      readonly ok: false;
      readonly error: RpcSerializedError;
    }
  | {
      readonly kind: "cancel";
      readonly version: 1;
      readonly requestId: string;
      readonly sender: PeerAddress;
      readonly target?: PeerAddress;
      readonly reason?: RpcSerializedError;
    };

/**
 * Bidirectional converter between RPC protocol envelopes and transport payloads.
 *
 * Codecs must not detach transferable resources or perform hidden retries.
 */
export interface RpcCodec<Envelope = RpcEnvelope, Wire = unknown> {
  /** Converts an outbound envelope into the transport payload format. */
  encode(envelope: Envelope): Wire;
  /** Validates and decodes an inbound payload into a protocol envelope. */
  decode(input: unknown): Envelope;
}

/** Transport-level delivery guarantee flags inspected at endpoint setup. */
export interface TransportCapabilities<SupportsTransfer extends boolean = boolean> {
  /** Whether the transport supports explicit ownership transfer lists. */
  readonly supportsTransfer: SupportsTransfer;
  /** Whether the profile guarantees request-before-cancel logical dispatch. */
  readonly guaranteesRequestBeforeCancel: boolean;
  /** Whether messages from one sender arrive in FIFO order without duplication. */
  readonly supportsOrderedStreams?: boolean;
  /** Whether `sendMany` uses native multicast rather than per-peer fan-out. */
  readonly supportsNativeMulticast?: boolean;
}

/**
 * Abstract transport boundary connecting the RPC core to a communication medium.
 *
 * Adapters own platform readiness, listener setup, and post-encoding transfer.
 */
export interface RpcTransport<
  Wire = unknown,
  PostOptions = undefined,
  TransferResource = never,
  SupportsTransfer extends boolean = boolean,
> {
  /** Declared capabilities used for static and runtime profile checks. */
  readonly capabilities: TransportCapabilities<SupportsTransfer>;
  /**
   * Sends an encoded payload to a single target peer.
   *
   * Implementations document when posting occurs and must validate any
   * `transfer` resources as reachable from `payload` before posting.
   */
  send(
    target: PeerAddress,
    payload: Wire,
    options?: PostOptions,
    transfer?: readonly TransferResource[],
  ): void | Promise<void>;
  /**
   * Optional batch/multicast send hook for `notifyMany`.
   *
   * When omitted, the core fans out to `send` for each selected peer.
   */
  sendMany?(
    targets: readonly PeerAddress[],
    payload: Wire,
    options?: PostOptions,
  ): void | Promise<void | readonly PeerSendOutcome[]>;
  /** Subscribes to inbound raw payloads accompanied by sender identity. */
  subscribe(listener: (from: PeerAddress, payload: unknown) => void): () => void;
  /** Closes an owned transport, awaiting asynchronous teardown when applicable. */
  close?(): void | Promise<void>;
}

/** Injectable timer scheduler so tests control deadlines deterministically. */
export interface RpcScheduler {
  /** Schedules `callback` after `delayMs` and returns a cancellation function. */
  setTimeout(callback: () => void, delayMs: number): () => void;
}

/** Injectable identifier generator for request, stream, and instance IDs. */
export type RpcIdGenerator = () => string;

/** Diagnostic event emitted without throwing back into protocol cleanup. */
export type RpcDiagnosticEvent =
  | { readonly type: "invalid-envelope"; readonly peer?: PeerAddress; readonly error: RpcError }
  | { readonly type: "unmatched-response"; readonly requestId: string; readonly peer: PeerAddress }
  | { readonly type: "late-send-failure"; readonly operation: string; readonly error: RpcError }
  | { readonly type: "handler-error"; readonly method: string; readonly peer: PeerAddress; readonly error: unknown };

/** Context supplied to every registered RPC method handler. */
export interface RpcInvocationContext {
  /** Authenticated or transport-assigned sender address for this invocation. */
  readonly peer: PeerAddress;
  /** Cancellation signal aborted on remote cancel, peer departure, or close. */
  readonly signal: CancelSignal;
  /** Whether the request was sent as a one-way notification (`true`) or call (`false`). */
  readonly isNotification: boolean;
}

/** Per-invocation options for unary `call` requests. */
export interface RpcCallOptions<PostOptions = undefined> {
  /** Optional overall deadline in milliseconds; non-positive or omitted means no deadline. */
  readonly timeoutMs?: number;
  /** Optional caller cancellation signal. */
  readonly signal?: CancelSignal;
  /** Transport-specific sending options inferred from the bound transport. */
  readonly postOptions?: PostOptions;
}

/** Per-invocation options for `notify` and `notifyMany`. */
export interface RpcNotifyOptions<PostOptions = undefined> {
  /** Optional signal checked before encoding and posting. */
  readonly signal?: CancelSignal;
  /** Transport-specific sending options inferred from the bound transport. */
  readonly postOptions?: PostOptions;
}

/** Builds a call or notify method signature separating tuple `args` from `options`. */
type ProxyMethodSignature<
  Args extends readonly unknown[],
  InT extends TransferRequirement,
  TransferResource,
  Options,
  Return,
> = Args extends readonly []
  ? {
      (): Promise<Return>;
      (args: readonly [], options?: Options): Promise<Return>;
    }
  : "required" extends InT
    ? number extends Args["length"]
      ? <const A extends ClientArgs<Args, InT, TransferResource>>(
          args: A & (TupleContainsTransfer<A> extends true ? unknown : never),
          options?: Options,
        ) => Promise<Return>
      : (
          args: ClientArgs<Args, InT, TransferResource>,
          options?: Options,
        ) => Promise<Return>
    : (
        args: ClientArgs<Args, InT, TransferResource>,
        options?: Options,
      ) => Promise<Return>;

/**
 * Typed `call` proxy derived from a shared contract `C`.
 *
 * Arguments are always passed as an explicit tuple separated from `options` so
 * optional and rest parameters remain unambiguous at runtime. Methods with an
 * empty fixed parameter tuple `[]` may also be called with zero arguments.
 */
export type RpcCallProxy<
  C extends ContractShape,
  PostOptions,
  TransferResource,
> = {
  readonly [K in CallableKeys<C>]: C[K] extends RpcMethodDescriptor<
    "call",
    infer Args,
    infer Result,
    infer InT
  >
    ? ProxyMethodSignature<
        Args,
        InT,
        TransferResource,
        RpcCallOptions<PostOptions>,
        Result
      >
    : never;
};

/**
 * Typed `notify` proxy derived from a shared contract `C`.
 *
 * Arguments are always passed as an explicit tuple separated from `options` so
 * optional and rest parameters remain unambiguous at runtime.
 */
export type RpcNotifyProxy<
  C extends ContractShape,
  PostOptions,
  TransferResource,
> = {
  readonly [K in NotifiableKeys<C>]: C[K] extends RpcMethodDescriptor<
    "call" | "notify",
    infer Args,
    unknown,
    infer InT
  >
    ? ProxyMethodSignature<
        Args,
        InT,
        TransferResource,
        RpcNotifyOptions<PostOptions>,
        void
      >
    : never;
};

/** Typed unary client bound to one remote peer/instance. */
export interface RpcPeerClient<
  C extends ContractShape,
  PostOptions = undefined,
  TransferResource = never,
> {
  /** Target peer and connection instance bound to this client. */
  readonly peer: PeerAddress;
  /** Response-bearing remote method invocations. */
  readonly call: RpcCallProxy<C, PostOptions, TransferResource>;
  /** Explicit no-response notifications to this peer. */
  readonly notify: RpcNotifyProxy<C, PostOptions, TransferResource>;
  /**
   * Disposes only this peer binding without closing unrelated bindings or a
   * borrowed transport. Rejects in-flight waits owned by this binding.
   */
  dispose(): void;
}

/** Handler function type expected when registering method `K` of contract `C`. */
export type RpcMethodHandler<
  D extends RpcMethodDescriptor,
  TransferResource = never,
> = D extends RpcMethodDescriptor<
  "call",
  infer Args,
  infer Result,
  TransferRequirement,
  infer OutT
>
  ? (
      ctx: RpcInvocationContext,
      ...args: Args
    ) => Awaitable<HandlerResult<Result, OutT, TransferResource>>
  : D extends RpcMethodDescriptor<"notify", infer Args>
    ? (ctx: RpcInvocationContext, ...args: Args) => Awaitable<void>
    : never;

/**
 * Extension hook contract satisfied by optional stream extensions without
 * requiring the neutral root to import stream modules.
 */
export interface RpcStreamFeature<
  C extends ContractShape = ContractShape,
  Wire = unknown,
  PostOptions = undefined,
  TransferResource = never,
  EndpointExt = Record<never, never>,
> {
  readonly __brand: "RpcStreamFeature";
  readonly __phantom?: (
    contract: C,
    wire: Wire,
    postOptions: PostOptions,
    resource: TransferResource,
    endpointExt: EndpointExt,
  ) => void;
}

/** Configuration for creating an RPC endpoint (Room). */
export interface CreateRpcEndpointOptions<
  C extends ContractShape,
  Wire,
  PostOptions,
  TransferResource,
  SupportsTransfer extends boolean,
  StreamExt = never,
> {
  /** Shared API contract governing client calls and handler registrations. */
  readonly contract: C;
  /** Codec connecting `RpcEnvelope` to the transport's `Wire` payload type. */
  readonly codec: RpcCodec<RpcEnvelope, NoInfer<Wire>>;
  /** Transport adapter for the chosen communication profile. */
  readonly transport: RpcTransport<Wire, PostOptions, TransferResource, SupportsTransfer>;
  /** Local peer/instance identity announced in outbound envelopes. */
  readonly localPeer: PeerAddress;
  /** Whether `close()` / `closeAsync()` also closes the supplied transport (`"owned"` vs `"borrowed"`). */
  readonly transportOwnership?: "owned" | "borrowed";
  /** Optional deterministic scheduler for unit tests. */
  readonly scheduler?: RpcScheduler;
  /** Optional deterministic ID generator for unit tests. */
  readonly generateId?: RpcIdGenerator;
  /** Optional non-throwing diagnostic observer. */
  readonly onDiagnostic?: (event: RpcDiagnosticEvent) => void;
  /** Optional stream extension imported from `@vrtmrz/rpc/streams`. */
  readonly streams?: StreamExt;
}

/** Constraint enforcing static capability compatibility before creating an endpoint. */
export type ValidateEndpointCapabilities<
  C extends ContractShape,
  SupportsTransfer extends boolean,
  StreamExt,
> = ContractRequiresTransfer<C> extends true
  ? SupportsTransfer extends true
    ? ContractUsesStreams<C> extends true
      ? [StreamExt] extends [never]
        ? "Error: Contract contains stream methods; pass streams from '@vrtmrz/rpc/streams'."
        : unknown
      : unknown
    : "Error: Contract requires ownership transfer, which this transport does not support."
  : ContractUsesStreams<C> extends true
    ? [StreamExt] extends [never]
      ? "Error: Contract contains stream methods; pass streams from '@vrtmrz/rpc/streams'."
      : unknown
    : unknown;

/** Stream endpoint methods propagated from `StreamExt` when streams are enabled. */
export type EndpointStreamMethods<StreamExt> = [StreamExt] extends [never]
  ? Record<never, never>
  : [StreamExt] extends [
        RpcStreamFeature<ContractShape, unknown, unknown, unknown, infer EndpointExt>,
      ]
    ? EndpointExt
    : Record<never, never>;

/** Active RPC endpoint managing peer bindings, handlers, and multi-peer notifications. */
export type RpcEndpoint<
  C extends ContractShape,
  PostOptions = undefined,
  TransferResource = never,
  StreamExt = never,
> = {
  /** Binds a unary client interface to one specific `peer` and `instanceId`. */
  bindPeer(peer: PeerAddress): RpcPeerClient<C, PostOptions, TransferResource>;
  /**
   * Sends a notification to an explicit snapshot of peers in target order.
   *
   * Rejects transfer-required methods before any posting occurs.
   */
  notifyMany<K extends MultiNotifiableKeys<C>>(
    targets: readonly PeerAddress[],
    method: K,
    args: C[K] extends RpcMethodDescriptor<"call" | "notify", infer Args>
      ? Args
      : never,
    options?: RpcNotifyOptions<PostOptions>,
  ): Promise<readonly PeerSendOutcome[]>;
  /** Registers a handler for unary or notification method `K`; returns an unregister function. */
  handle<K extends NotifiableKeys<C>>(
    method: K,
    handler: RpcMethodHandler<C[K], TransferResource>,
  ): () => void;
  /** Signals that a remote peer instance has departed; fails its in-flight operations. */
  retirePeer(peer: PeerAddress): void;
  /** Synchronously rejects local waits, aborts handlers, and detaches listeners. */
  close(): void;
  /** Closes the endpoint and awaits owned transport teardown when `transportOwnership` is `"owned"`. */
  closeAsync(): Promise<void>;
} & EndpointStreamMethods<StreamExt>;
