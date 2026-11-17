import type {
  JsonValue,
  RequestContext,
  Room,
  Transport,
} from "../../src/service/contracts.js";

/** Existing physical rpc2 protocol, intentionally independent of the new endpoint. */
export type LegacyWire =
  | { wire: "raw"; payload: string }
  | {
      wire: "chunk";
      streamId: string;
      index: number;
      total: number;
      payload: string;
    }
  | { wire: "chunk-ack"; streamId: string; missing: number[] };

/** Legacy construction seam used by the reusable interoperability suite. */
export interface LegacyFactoryOptions {
  transport: Transport<LegacyWire>;
  maxWirePayloadBytes?: number;
  chunkMissingRetryMs?: number;
  canAcceptRequest?: (
    peerId: string,
    method: string,
    context: RequestContext<AbortSignal>,
  ) => boolean | Promise<boolean>;
  onProtocolWarning?: (message: string, peerId?: string) => void;
}

/** Candidate adapter must expose this common subset without changing wire semantics. */
export type LegacyRoomFactory = (
  options: LegacyFactoryOptions,
) => Room<JsonValue, AbortSignal>;
