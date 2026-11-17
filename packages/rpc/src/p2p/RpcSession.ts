import { RpcError } from "./RpcError.js";
import type { JsonLike, RpcCallOptions } from "./types.js";
interface RoomOperations {
  invoke(
    peerId: string,
    method: string,
    args: JsonLike[],
    options?: number | RpcCallOptions,
  ): Promise<JsonLike>;
  notify(peerId: string, method: string, args: JsonLike[]): Promise<void>;
}
/** Thin bound-peer facade; owns no connection or pending-call state. */
export class RpcSession {
  /** Peer selected by the host. */
  readonly peerId: string;
  private readonly room: RoomOperations;
  /** Binds a room capability to one peer. */
  constructor(room: RoomOperations, peerId: string) {
    this.room = room;
    this.peerId = peerId;
  }
  /** Waits for a remote response; defaults to 30 seconds, including void results. */
  async call<T = JsonLike>(
    method: string,
    args: JsonLike[] = [],
    options?: number | RpcCallOptions,
  ): Promise<T> {
    if (!this.peerId) {
      throw new RpcError("NOT_CONNECTED", "Peer is not connected");
    }
    return (await this.room.invoke(this.peerId, method, args, options)) as T;
  }
  /** Resolves on local sending, without waiting for a remote handler result. */
  async notify(method: string, args: JsonLike[] = []): Promise<void> {
    if (!this.peerId) {
      throw new RpcError("NOT_CONNECTED", "Peer is not connected");
    }
    await this.room.notify(this.peerId, method, args);
  }
  /** Legacy namespace proxy. Caller-supplied method/result types are not schema-validated. */
  createProxy<T extends object>(namespace: string): T {
    return new Proxy(
      {},
      {
        get: (_target, key) =>
          typeof key === "string"
            ? (...args: JsonLike[]) => this.call(`${namespace}.${key}`, args)
            : undefined,
      },
    ) as T;
  }
}
