/** JSON values supported by the existing P2P profile. */
export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

/** Common cancellation capability; legacy composition uses native AbortSignal. */
export interface CancellationSignal {
  /** Whether cancellation has been requested. */
  readonly aborted: boolean;
  /** Optional local cancellation reason. */
  readonly reason?: unknown;
  /** Registers a cancellation listener. */
  addEventListener(
    type: "abort",
    listener: () => void,
    options?: { readonly once?: boolean },
  ): void;
  /** Releases a cancellation listener. */
  removeEventListener(type: "abort", listener: () => void): void;
}

/** Options for a response-bearing call. */
export interface CallOptions<
  Signal extends CancellationSignal = CancellationSignal,
> {
  /** Legacy default: 30 seconds; non-positive disables the deadline only. */
  readonly timeoutMs?: number;
  /** Local cancellation settles promptly; remote cancellation is cooperative. */
  readonly signal?: Signal;
}

/** Bound-peer consumer capability, independent of a concrete room class. */
export interface Session<
  Value = JsonValue,
  Signal extends CancellationSignal = CancellationSignal,
> {
  /** Waits for a remote result, including when Result is void. Result is caller-selected, not schema-validated. */
  call<Result = Value>(
    method: string,
    args?: Value[],
    options?: number | CallOptions<Signal>,
  ): Promise<Result>;
  /** Resolves after local sending; does not acknowledge remote handler completion. */
  notify(method: string, args?: Value[]): Promise<void>;
}

/** Resolves sessions in the current room; hosts retain control of room replacement. */
export interface SessionSource<
  Value = JsonValue,
  Signal extends CancellationSignal = CancellationSignal,
> {
  /** Returns a session for a host-selected peer. */
  session(peerId: string): Session<Value, Signal>;
}

/** Context passed to cancellation-aware handlers. */
export interface RequestContext<
  Signal extends CancellationSignal = CancellationSignal,
> {
  /** Signal owned by this invocation, aborted on cancel, departure, or close. */
  readonly signal: Signal;
}

/** Optional registration behaviour shared by legacy calls and notifications. */
export interface RegisterOptions {
  /** Serialises this registered method across peers until each handler settles. */
  readonly serial?: boolean;
}

/** Server and client capability retained by the initial P2P facade. */
export interface Room<
  Value = JsonValue,
  Signal extends CancellationSignal = CancellationSignal,
> extends SessionSource<Value, Signal> {
  /** Registers or replaces a namespaced handler. */
  register<Args extends Value[], Result>(
    method: string,
    handler: (peerId: string, ...args: Args) => Result | Promise<Result>,
    options?: RegisterOptions,
  ): void;
  /** Registers or replaces a handler with invocation cancellation context. */
  registerCancellable<Args extends Value[], Result>(
    method: string,
    handler: (
      context: RequestContext<Signal>,
      peerId: string,
      ...args: Args
    ) => Result | Promise<Result>,
    options?: RegisterOptions,
  ): void;
  /** Idempotently releases RPC state and subscriptions; does not close a borrowed connection. */
  close(): void;
}

/** Encodes an envelope into the logical payload consumed by framing. */
export interface Codec<Envelope, Encoded> {
  /** Converts outbound data; may throw before sending. */
  encode(envelope: Envelope): Encoded;
  /** Validates/converts untrusted inbound data, or throws. */
  decode(payload: unknown): Envelope;
}

/** Physical transport capability; framing may produce several Wire messages per envelope. */
export interface Transport<Wire, PostOptions = undefined> {
  /** Completion means local sending; it does not establish remote logical dispatch. */
  send(
    message: Wire,
    peerId: string,
    options?: PostOptions,
  ): void | Promise<void>;
  /** Subscribes to physical messages; disposer removes only this subscription. */
  onMessage(handler: (message: Wire, peerId: string) => void): () => void;
  /** Optional host-owned peer lifecycle subscription. */
  onPeerJoin?(handler: (peerId: string) => void): () => void;
  /** Optional host-owned peer lifecycle subscription. */
  onPeerLeave?(handler: (peerId: string) => void): () => void;
}

/** Timing and identity dependencies shared by invocation and framing owners. */
export interface Runtime {
  /** Schedules the callback to run after registration returns. The returned cancellation function is idempotent. */
  scheduleTimeout(callback: () => void, delayMs: number): () => void;
  /** Produces IDs unique within the active protocol scope; tests may inject deterministic values. */
  createId(kind: "request" | "chunk"): string;
}
