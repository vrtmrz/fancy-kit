import type {
  CancellationSignal,
  Codec,
  Runtime,
} from "../service/contracts.js";
import { createInboundCalls } from "./inboundCalls.js";
import { createFraming } from "./framing.js";
import { createPendingInvocations } from "./pendingInvocations.js";
import { createRuntime, createHostAbortController } from "./runtime.js";
import { createJsonCodec } from "./jsonCodec.js";
import { RpcSession } from "./RpcSession.js";
import { RpcError } from "./RpcError.js";
import {
  RPC_VERSION_MAJOR,
  RPC_VERSION_MINOR,
  type JsonLike,
  type RpcCallOptions,
  type RpcEnvelope,
  type RpcRoomOptions,
  type RpcMethodHandler,
  type RpcCancellationAwareMethodHandler,
  type RpcRegisterOptions,
} from "./types.js";

function validateMethod(method: string): void {
  if (!method.includes(".") && !method.includes("/")) {
    throw new RpcError(
      "PROTOCOL_ERROR",
      `Method must be namespaced: ${method}`,
    );
  }
}
/** Legacy-compatible P2P room with injected codec, physical transport, timing, and IDs. */
export class RpcRoom<
  S extends CancellationSignal = CancellationSignal,
  PostOptions = undefined,
> {
  private closed = false;
  private readonly runtime: Runtime;
  private readonly codec: Codec<RpcEnvelope, string>;
  private readonly sessions = new Map<string, RpcSession>();
  private readonly disposers: Array<() => void> = [];
  private readonly pending: ReturnType<typeof createPendingInvocations>;
  private readonly inbound: ReturnType<typeof createInboundCalls<S>>;
  private readonly framing: ReturnType<typeof createFraming>;
  private readonly options: RpcRoomOptions<S, PostOptions>;

  /** Subscribes to the borrowed transport; does not create or own its connection. */
  constructor(options: RpcRoomOptions<S, PostOptions>) {
    this.options = options;
    this.runtime = createRuntime(options.runtime);
    this.codec = options.codec ?? createJsonCodec();
    this.inbound = createInboundCalls({
      createAbortController:
        options.createAbortController ?? createHostAbortController<S>,
      canAcceptRequest: options.canAcceptRequest,
      sendEnvelope: (peerId, envelope) => this.sendEnvelope(peerId, envelope),
      warn: (message, peerId) => this.warn(message, peerId),
    });
    this.pending = createPendingInvocations({
      sendEnvelope: (peerId, envelope) => this.sendEnvelope(peerId, envelope),
      createRequestId: () => this.runtime.createId("request"),
      scheduleTimeout: this.runtime.scheduleTimeout,
      onProtocolWarning: (message, peerId) => this.warn(message, peerId),
    });
    this.framing = createFraming({
      send: async (message, peerId) => {
        await options.transport.send(message, peerId, options.postOptions);
      },
      receive: (payload, peerId) => this.receiveEnvelope(payload, peerId),
      runtime: this.runtime,
      maxWirePayloadBytes: options.maxWirePayloadBytes ?? 32 * 1024,
      chunkMissingRetryMs: options.chunkMissingRetryMs ?? 350,
      warn: (message, peerId) => this.warn(message, peerId),
    });
    try {
      this.disposers.push(
        options.transport.onMessage((message, peerId) => {
          void this.framing
            .receive(message, peerId)
            .catch((error) => this.warn(String(error), peerId));
        }),
      );
      if (options.transport.onPeerJoin) {
        this.disposers.push(
          options.transport.onPeerJoin((peerId) => {
            if (this.closed) {
              return;
            }
            void this.sendEnvelope(peerId, {
              kind: "handshake",
              versionMajor: RPC_VERSION_MAJOR,
              versionMinor: RPC_VERSION_MINOR,
            }).catch((error) => this.warn(String(error), peerId));
          }),
        );
      }
      if (options.transport.onPeerLeave) {
        this.disposers.push(
          options.transport.onPeerLeave((peerId) => this.peerLeft(peerId)),
        );
      }
    } catch (error) {
      this.close();
      throw error;
    }
  }
  private warn(message: string, peerId?: string): void {
    try {
      this.options.onProtocolWarning?.(message, peerId);
    } catch {
      /* Diagnostics never interrupt protocol cleanup. */
    }
  }
  private sendEnvelope(peerId: string, envelope: RpcEnvelope): Promise<void> {
    // Keep encoding inside the Promise boundary so synchronous codec failures settle calls.
    return this.encodeAndSend(peerId, envelope);
  }
  private async encodeAndSend(
    peerId: string,
    envelope: RpcEnvelope,
  ): Promise<void> {
    await this.framing.send(peerId, this.codec.encode(envelope));
  }
  private async receiveEnvelope(
    payload: string,
    peerId: string,
  ): Promise<void> {
    if (this.closed) {
      return;
    }
    let envelope: RpcEnvelope;
    try {
      envelope = this.codec.decode(payload);
    } catch (error) {
      this.warn(`Invalid payload: ${String(error)}`, peerId);
      return;
    }
    switch (envelope.kind) {
      case "handshake":
        this.inbound.receiveHandshake(
          peerId,
          envelope.versionMajor,
          envelope.versionMinor,
        );
        return;
      case "cancel":
        this.inbound.cancel(peerId, envelope.requestId);
        return;
      case "response":
        this.pending.receiveResponse(envelope, peerId);
        return;
      case "request":
        await this.inbound.receiveRequest(envelope, peerId);
        return;
    }
  }
  private peerLeft(peerId: string): void {
    this.pending.peerLeft(peerId);
    this.inbound.peerLeft(peerId);
    this.framing.peerLeft(peerId);
    this.sessions.delete(peerId);
  }
  /** Returns a cached bound-peer facade. No peer discovery or admission is performed. */
  session(peerId: string): RpcSession {
    let session = this.sessions.get(peerId);
    if (!session) {
      session = new RpcSession(this, peerId);
      this.sessions.set(peerId, session);
    }
    return session;
  }
  /** Registers or replaces an ordinary namespaced method. */
  register<T extends JsonLike[], U>(
    method: string,
    handler: RpcMethodHandler<T, U>,
    options: RpcRegisterOptions = {},
  ): void {
    validateMethod(method);
    this.inbound.register(method, {
      invoke: (_ctx, peerId, args) => handler(peerId, ...(args as T)),
      serial: options.serial ?? false,
      queue: Promise.resolve(),
    });
  }
  /** Registers a namespaced handler with cooperative cancellation context. */
  registerCancellable<T extends JsonLike[], U>(
    method: string,
    handler: RpcCancellationAwareMethodHandler<T, U, S>,
    options: RpcRegisterOptions = {},
  ): void {
    validateMethod(method);
    this.inbound.register(method, {
      invoke: (ctx, peerId, args) => handler(ctx, peerId, ...(args as T)),
      serial: options.serial ?? false,
      queue: Promise.resolve(),
    });
  }
  /** Starts a response-bearing call; numeric and object timeout forms remain compatible. */
  async invoke(
    peerId: string,
    method: string,
    args: JsonLike[],
    options?: number | RpcCallOptions,
  ): Promise<JsonLike> {
    validateMethod(method);
    if (this.closed) {
      throw new RpcError("NOT_CONNECTED", "Room is closed");
    }
    return await this.pending.invoke(peerId, method, args, options);
  }
  /** Sends a notification with no response wait or deadline. */
  async notify(
    peerId: string,
    method: string,
    args: JsonLike[],
  ): Promise<void> {
    validateMethod(method);
    if (this.closed) {
      throw new RpcError("NOT_CONNECTED", "Room is closed");
    }
    await this.sendEnvelope(peerId, {
      kind: "request",
      requestId: this.runtime.createId("request"),
      method,
      args,
      expectsResponse: false,
    });
  }
  /** Explicit cancellation retains the legacy unknown-ID forwarding behaviour. */
  async cancel(peerId: string, requestId: string): Promise<void> {
    await this.pending.cancel(peerId, requestId);
  }
  /** Idempotently releases local state and listeners; the borrowed transport remains open. */
  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    const cleanup = [
      ...this.disposers.splice(0),
      () => this.pending.close(),
      () => this.inbound.close(),
      () => this.framing.close(),
    ];
    for (const dispose of cleanup) {
      try {
        dispose();
      } catch (error) {
        this.warn(String(error));
      }
    }
    this.sessions.clear();
  }
}
