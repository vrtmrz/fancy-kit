import type { LegacyFactoryOptions } from "../../compatibility/legacyTypes.js";
import type { JsonValue, Room } from "../../../src/service/contracts.js";
/** Pinned test-only Commonlib implementation; not the new production room. */
export declare const RpcRoom: new (
  options: LegacyFactoryOptions,
) => Room<JsonValue, AbortSignal>;
/** Legacy error constructor from the same bundle as RpcRoom. */
export declare class RpcError extends Error {
  constructor(
    code:
      | "TIMEOUT"
      | "NOT_CONNECTED"
      | "REMOTE_ERROR"
      | "CANCELLED"
      | "PROTOCOL_ERROR",
    message: string,
    details?: JsonValue,
  );
}
