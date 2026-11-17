import {
  createDeferredAction,
  type DeferredAction,
} from "octagonal-wheels/concurrency/deferredAction";
import type { Runtime } from "../service/contracts.js";
import type { RpcWireMessage } from "./types.js";
import {
  IncomingChunkBuffer,
  estimateBytes,
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
}
interface State {
  closed: boolean;
  outgoing: Map<string, Outgoing>;
  incoming: Map<string, Incoming>;
  waits: Map<string, DeferredAction>;
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
  if (estimateBytes(payload) <= deps.maxWirePayloadBytes) {
    await deps.send({ wire: "raw", payload }, peerId);
    return;
  }
  const streamId = deps.runtime.createId("chunk");
  const chunks = splitIntoChunks(payload, deps.maxWirePayloadBytes);
  state.outgoing.set(streamId, { peerId, chunks });
  for (let index = 0; index < chunks.length; index++) {
    if (state.closed) {
      return;
    }
    await sendChunk(deps, peerId, streamId, chunks, index);
  }
}
function scheduleMissing(
  state: State,
  deps: Dependencies,
  streamId: string,
  peerId: string,
): void {
  const key = JSON.stringify([peerId, streamId]);
  state.waits.get(key)?.dispose();
  const wait = createDeferredAction(() => {
    const incoming = state.incoming.get(key)?.buffer;
    if (!incoming || incoming.isComplete()) {
      return;
    }
    void deps
      .send(
        { wire: "chunk-ack", streamId, missing: incoming.missingIndices() },
        peerId,
      )
      .catch((error) => deps.warn(String(error), peerId));
  }, deps.runtime.scheduleTimeout);
  wait.schedule(deps.chunkMissingRetryMs);
  state.waits.set(key, wait);
}
async function receiveChunk(
  state: State,
  deps: Dependencies,
  message: Extract<RpcWireMessage, { wire: "chunk" }>,
  peerId: string,
): Promise<void> {
  const key = JSON.stringify([peerId, message.streamId]);
  let incoming = state.incoming.get(key)?.buffer;
  if (!incoming) {
    incoming = new IncomingChunkBuffer(message.total);
    state.incoming.set(key, { peerId, buffer: incoming });
  }
  incoming.add(message.index, message.payload);
  scheduleMissing(state, deps, message.streamId, peerId);
  if (incoming.isComplete()) {
    state.waits.get(key)?.dispose();
    state.waits.delete(key);
    state.incoming.delete(key);
    await deps.send(
      { wire: "chunk-ack", streamId: message.streamId, missing: [] },
      peerId,
    );
    if (!state.closed) {
      await deps.receive(incoming.toPayload(), peerId);
    }
  }
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
    waits: new Map(),
  };
  return {
    send: (peerId: string, payload: string) =>
      sendPayload(state, deps, peerId, payload),
    receive: (message: RpcWireMessage, peerId: string) =>
      receiveWire(state, deps, message, peerId),
    peerLeft(peerId: string): void {
      for (const [key, incoming] of state.incoming) {
        if (incoming.peerId === peerId) {
          state.waits.get(key)?.dispose();
          state.waits.delete(key);
          state.incoming.delete(key);
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
      for (const wait of state.waits.values()) {
        wait.dispose();
      }
      state.waits.clear();
      state.incoming.clear();
      state.outgoing.clear();
    },
  };
}
