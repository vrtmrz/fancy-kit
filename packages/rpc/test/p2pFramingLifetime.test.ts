import { setImmediate as nextTurn } from "node:timers/promises";
import { expect, it, vi } from "vitest";
import { RpcRoom } from "../src/p2p.js";
import { createLegacyPair } from "./compatibility/legacyPair.js";

it.each(["room close", "peer departure"] as const)(
  "rejects a partially sent notification on %s",
  async (event) => {
    const pair = createLegacyPair();
    const room = new RpcRoom({
      transport: pair.a.transport,
      maxWirePayloadBytes: 128,
    });
    const wire = pair.wire.a;
    try {
      wire.setSendSettlementMode("manual");
      const result = room
        .session(wire.remotePeer.peerId)
        .notify("db.progress", ["x".repeat(450)]);
      expect(wire.sentMessages[0]?.payload).toMatchObject({
        wire: "chunk",
        index: 0,
      });
      if (event === "room close") {
        room.close();
      } else {
        pair.a.leave();
      }
      wire.setSendSettlementMode("immediate");
      expect(wire.resolveNextSend()).toBe(true);
      await expect(result).rejects.toMatchObject({ code: "NOT_CONNECTED" });
      expect(wire.sentMessages).toHaveLength(1);
    } finally {
      room.close();
      pair.wire.dispose();
    }
  },
);

it("stops a retransmission already in progress when its peer leaves", async () => {
  const pair = createLegacyPair();
  const room = new RpcRoom({
    transport: pair.a.transport,
    maxWirePayloadBytes: 128,
  });
  const wire = pair.wire.a;
  try {
    await room
      .session(wire.remotePeer.peerId)
      .notify("db.progress", ["x".repeat(450)]);
    const first = wire.sentMessages[0]!.payload;
    if (first.wire !== "chunk") {
      throw new Error("Expected a chunked notification");
    }
    const before = wire.sentMessages.length;
    wire.setSendSettlementMode("manual");
    wire.injectInbound(wire.remotePeer, {
      wire: "chunk-ack",
      streamId: first.streamId,
      missing: [0, 1],
    });
    expect(wire.sentMessages[before]?.payload).toEqual(first);
    pair.a.leave();
    wire.setSendSettlementMode("immediate");
    expect(wire.resolveNextSend()).toBe(true);
    await nextTurn();
    expect(wire.sentMessages).toHaveLength(before + 1);
  } finally {
    room.close();
    pair.wire.dispose();
  }
});

it("dispatches only the new peer's notification when an old completion ACK settles after reconnection", async () => {
  const pair = createLegacyPair();
  const room = new RpcRoom({ transport: pair.b.transport });
  const wire = pair.wire.b;
  const handle = vi.fn();
  room.register("db.progress", handle);
  function receive(label: string) {
    const payload = JSON.stringify({
      kind: "request",
      requestId: label,
      method: "db.progress",
      args: [label],
      expectsResponse: false,
    });
    for (const [index, part] of [
      payload.slice(0, 10),
      payload.slice(10),
    ].entries()) {
      wire.injectInbound(wire.remotePeer, {
        wire: "chunk",
        streamId: "shared",
        total: 2,
        index,
        payload: part,
      });
    }
  }
  try {
    wire.setSendSettlementMode("manual");
    receive("old");
    expect(wire.pendingSendCount).toBe(1);
    pair.b.leave();
    wire.setSendSettlementMode("immediate");
    pair.b.join();
    wire.setSendSettlementMode("manual");
    receive("new");
    expect(wire.pendingSendCount).toBe(2);
    expect(wire.resolveNextSend()).toBe(true);
    await nextTurn();
    expect(handle).not.toHaveBeenCalled();
    expect(wire.resolveNextSend()).toBe(true);
    await nextTurn();
    expect(handle.mock.calls).toEqual([[wire.remotePeer.peerId, "new"]]);
  } finally {
    room.close();
    pair.wire.dispose();
  }
});

it.each(["room close", "peer departure"] as const)(
  "releases all missing-chunk waits on %s when a scheduler canceller throws",
  (event) => {
    const pair = createLegacyPair();
    const callbacks: Array<() => void> = [];
    const cancel = vi.fn(() => { throw new Error("cannot clear timer"); });
    const warning = vi.fn();
    const room = new RpcRoom({
      transport: pair.b.transport,
      onProtocolWarning: warning,
      runtime: { scheduleTimeout(callback) { callbacks.push(callback); return cancel; } },
    });
    const wire = pair.wire.b;
    try {
      for (const streamId of ["first", "second"]) {
        wire.injectInbound(wire.remotePeer, { wire: "chunk", streamId, index: 0, total: 2, payload: "{" });
      }
      expect(callbacks).toHaveLength(2);
      if (event === "room close") {
        room.close();
      } else {
        pair.b.leave();
      }
      for (const callback of callbacks) {
        callback();
      }
      expect(cancel).toHaveBeenCalledTimes(2);
      expect(warning).toHaveBeenCalledTimes(2);
      expect(wire.sentMessages).toHaveLength(0);
    } finally {
      room.close();
      pair.wire.dispose();
    }
  },
);

it("acknowledges and dispatches a complete payload without scheduling another missing-chunk wait", async () => {
  const pair = createLegacyPair();
  const schedule = vi.fn(() => () => { throw new Error("cannot clear timer"); });
  const room = new RpcRoom({ transport: pair.b.transport, runtime: { scheduleTimeout: schedule } });
  const wire = pair.wire.b;
  const received = vi.fn();
  room.register("db.progress", received);
  const payload = JSON.stringify({
    kind: "request", requestId: "r", method: "db.progress", args: [42], expectsResponse: false,
  });
  try {
    for (const [index, part] of [payload.slice(0, 10), payload.slice(10)].entries()) {
      wire.injectInbound(wire.remotePeer, { wire: "chunk", streamId: "s", total: 2, index, payload: part });
    }
    await nextTurn();
    expect(schedule).toHaveBeenCalledOnce();
    expect(received).toHaveBeenCalledExactlyOnceWith(wire.remotePeer.peerId, 42);
    expect(wire.sentMessages.map((message) => message.payload)).toEqual([
      { wire: "chunk-ack", streamId: "s", missing: [] },
    ]);
  } finally {
    room.close();
    pair.wire.dispose();
  }
});

it("keeps a retry cancelled if the peer leaves while replacing its timer", () => {
  const pair = createLegacyPair();
  const callbacks: Array<() => void> = [];
  const room = new RpcRoom({
    transport: pair.b.transport,
    runtime: {
      scheduleTimeout(callback) {
        callbacks.push(callback);
        return () => pair.b.leave();
      },
    },
  });
  const wire = pair.wire.b;
  try {
    for (const index of [0, 1]) {
      wire.injectInbound(wire.remotePeer, { wire: "chunk", streamId: "s", total: 3, index, payload: "x" });
    }
    for (const callback of callbacks) {
      callback();
    }
    expect(wire.sentMessages).toHaveLength(0);
    expect(callbacks).toHaveLength(1);
  } finally {
    room.close();
    pair.wire.dispose();
  }
});
