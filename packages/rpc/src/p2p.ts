/** P2P implementation retaining the existing Commonlib RPC wire protocol. */
export { RpcRoom } from "./p2p/RpcRoom.js";
export { RpcSession } from "./p2p/RpcSession.js";
export { RpcError, asRpcErrorShape } from "./p2p/RpcError.js";
export { createJsonCodec } from "./p2p/jsonCodec.js";
export { RPC_VERSION_MAJOR, RPC_VERSION_MINOR } from "./p2p/types.js";
export type {
  JsonLike,
  RpcErrorCode,
  RpcErrorShape,
  RpcCallOptions,
  RpcRequestContext,
  RpcRegisterOptions,
  RpcRoomOptions,
  RpcAbortController,
  RpcEnvelope,
  RpcWireMessage,
  RpcRequestEnvelope,
  TransportAdapter,
  RpcMethodHandler,
  RpcCancellationAwareMethodHandler,
} from "./p2p/types.js";
export type {
  CancellationSignal,
  Codec,
  JsonValue,
  Room,
  Session,
  SessionSource,
  Runtime,
  Transport,
} from "./service/contracts.js";
