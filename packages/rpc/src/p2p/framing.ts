import {
  createDeferredAction,
  type DeferredAction,
} from "octagonal-wheels/concurrency/deferredAction";
import type { Runtime } from "../service/contracts.js";
import { RpcError } from "./RpcError.js";
import type { RpcWireMessage } from "./types.js";
import {
  IncomingChunkBuffer,
  utf8ByteLength,
  splitIntoChunks,
} from "./chunking.js";
interface Dependencies {
  send(message: RpcWireMessage, peerId: string): Promise<void>;
  receive(payload: string, peerId: string): Promise<void>;
  runtime: Runtime;
  maxWirePayloadBytes: number;
  chunkMissingRetryMs: number;
  warn(message: string, peerId: string): void;
}
interface Outgoing {
  peerId: string;
  chunks: string[];
}
interface Incoming {
  peerId: string;
  buffer: IncomingChunkBuffer;
  missingChunkRequest: DeferredAction;
}
interface State {
  closed: boolean;
  outgoing: Map<string, Outgoing>;
  incoming: Map<string, Incoming>;
  // A peer can acknowledge a stream before its local send settles. Track the
  // send separately so departure can still stop it, even if the peer ID is reused.
  activeSends: Set<{ readonly peerId: string }>;
}
function sendChunk(
  deps: Pick<Dependencies, "send">,
  peerId: string,
  streamId: string,
  chunks: string[],
  index: number,
): Promise<void> {
  return deps.send(
    {
      wire: "chunk",
      streamId,
      index,
      total: chunks.length,
      payload: chunks[index]!,
    },
    peerId,
  );
}
async function sendPayload(
  state: State,
  deps: Dependencies,
  peerId: string,
  payload: string,
): Promise<void> {
  if (utf8ByteLength(payload) <= deps.maxWirePayloadBytes) {
    await deps.send({ wire: "raw", payload }, peerId);
    return;
  }
  if (state.closed) {
    throw new RpcError("NOT_CONNECTED", "Room is closed");
  }
  const streamId = deps.runtime.createId("chunk");
  const chunks = splitIntoChunks(payload, deps.maxWirePayloadBytes);
  const outgoing = { peerId, chunks };
  state.outgoing.set(streamId, outgoing);
  state.activeSends.add(outgoing);
  try {
    for (let index = 0; index < chunks.length; index++) {
      if (!state.activeSends.has(outgoing)) {
        throw new RpcError(
          "NOT_CONNECTED",
          "Chunked send interrupted by disconnection",
        );
      }
      await sendChunk(deps, peerId, streamId, chunks, index);
    }
  } finally {
    state.activeSends.delete(outgoing);
  }
}
function createIncoming(
  deps: Dependencies,
  streamId: string,
  peerId: string,
  total: number,
): Incoming {
  const buffer = new IncomingChunkBuffer(total);
  const missingChunkRequest = createDeferredAction(() => {
    void deps
      .send({ wire: "chunk-ack", streamId, missing: buffer.missingIndices() }, peerId)
      .catch((error) => deps.warn(String(error), peerId));
  }, deps.runtime.scheduleTimeout);
  return { peerId, buffer, missingChunkRequest };
}

async function receiveChunk(
  state: State,
  deps: Dependencies,
  message: Extract<RpcWireMessage, { wire: "chunk" }>,
  peerId: string,
): Promise<void> {
  const key = JSON.stringify([peerId, message.streamId]);
  let incoming = state.incoming.get(key);
  if (!incoming) {
    incoming = createIncoming(deps, message.streamId, peerId, message.total);
    state.incoming.set(key, incoming);
  }
  incoming.buffer.add(message.index, message.payload);
  if (!incoming.buffer.isComplete()) {
    // A host canceller can retire this peer. A disposed action ignores the next schedule.
    incoming.missingChunkRequest.cancel();
    incoming.missingChunkRequest.schedule(deps.chunkMissingRetryMs);
    return;
  }
  state.incoming.delete(key);
  state.activeSends.add(incoming);
  try {
    incoming.missingChunkRequest.dispose();
    if (!state.activeSends.has(incoming)) {
      return;
    }
    await deps.send({ wire: "chunk-ack", streamId: message.streamId, missing: [] }, peerId);
    if (!state.activeSends.has(incoming)) {
      return;
    }
  } finally {
    state.activeSends.delete(incoming);
  }
  await deps.receive(incoming.buffer.toPayload(), peerId);
}
async function receiveWire(
  state: State,
  deps: Dependencies,
  message: RpcWireMessage,
  peerId: string,
): Promise<void> {
  if (state.closed) {
    return;
  }
  if (message.wire === "raw") {
    await deps.receive(message.payload, peerId);
    return;
  }
  if (message.wire === "chunk") {
    await receiveChunk(state, deps, message, peerId);
    return;
  }
  const outgoing = state.outgoing.get(message.streamId);
  if (!outgoing || outgoing.peerId !== peerId) {
    return;
  }
  if (message.missing.length === 0) {
    state.outgoing.delete(message.streamId);
    return;
  }
  for (const index of message.missing) {
    if (state.outgoing.get(message.streamId) !== outgoing) {
      return;
    }
    if (outgoing.chunks[index] !== undefined) {
      await sendChunk(
        deps,
        outgoing.peerId,
        message.streamId,
        outgoing.chunks,
        index,
      );
    }
  }
}
/** Owns the legacy raw/chunk/ack state and its quiet-period waits. */
export function createFraming(deps: Dependencies) {
  const state: State = {
    closed: false,
    outgoing: new Map(),
    incoming: new Map(),
    activeSends: new Set(),
  };
  return {
    send: (peerId: string, payload: string) =>
      sendPayload(state, deps, peerId, payload),
    receive: (message: RpcWireMessage, peerId: string) =>
      receiveWire(state, deps, message, peerId),
    peerLeft(peerId: string): void {
      for (const operation of state.activeSends) {
        if (operation.peerId === peerId) {
          state.activeSends.delete(operation);
        }
      }
      for (const [key, incoming] of state.incoming) {
        if (incoming.peerId === peerId) {
          state.incoming.delete(key);
          incoming.missingChunkRequest.dispose();
        }
      }
      for (const [id, outgoing] of state.outgoing) {
        if (outgoing.peerId === peerId) {
          state.outgoing.delete(id);
        }
      }
    },
    close(): void {
      state.closed = true;
      state.activeSends.clear();
      for (const incoming of state.incoming.values()) {
        incoming.missingChunkRequest.dispose();
      }
      state.incoming.clear();
      state.outgoing.clear();
    },
  };
}
