import { expect, it } from "vitest";
import { RpcRoom } from "../src/p2p.js";
import { createLegacyPair } from "./compatibility/legacyPair.js";

it("ignores completion acknowledgements from a different peer", async () => {
  const pair = createLegacyPair();
  const room = new RpcRoom({
    transport: pair.a.transport,
    maxWirePayloadBytes: 96,
  });
  try {
    pair.wire.a.setDeliveryMode({ kind: "manual" });
    await room.session("peer-b").notify("db.large", ["x".repeat(400)]);
    const first = pair.wire.a.sentMessages[0]!.payload;
    if (first.wire !== "chunk") {
      throw new Error("Expected chunks");
    }
    const sent = pair.wire.a.sentMessages.length;
    pair.wire.a.injectInbound(
      { peerId: "other-peer", instanceId: "other" },
      { wire: "chunk-ack", streamId: first.streamId, missing: [] },
    );
    pair.wire.a.injectInbound(pair.wire.a.remotePeer, {
      wire: "chunk-ack",
      streamId: first.streamId,
      missing: [0],
    });
    await Promise.resolve();
    expect(pair.wire.a.sentMessages).toHaveLength(sent + 1);
    expect(pair.wire.a.sentMessages.at(-1)!.payload).toEqual(first);
  } finally {
    room.close();
    pair.wire.dispose();
  }
});
