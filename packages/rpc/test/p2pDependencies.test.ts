import { afterEach, expect, it, vi } from "vitest";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import {
  RpcRoom,
  createJsonCodec,
  type Room,
  type JsonValue,
} from "../src/p2p.js";
import { createLegacyPair } from "./compatibility/legacyPair.js";
import { createControllableScheduler } from "./facilities/controllableScheduler.js";

const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const dispose of cleanup.splice(0).reverse()) {
    dispose();
  }
});

it("injects codec, request IDs, timers, native controllers, and typed post options", async () => {
  const pair = createLegacyPair();
  cleanup.push(() => pair.wire.dispose());
  const scheduler = createControllableScheduler();
  cleanup.push(() => scheduler.dispose());
  const json = createJsonCodec();
  const codec = {
    encode: vi.fn(
      (envelope: Parameters<typeof json.encode>[0]) =>
        `!${json.encode(envelope)}`,
    ),
    decode: vi.fn((wire: unknown) => json.decode(String(wire).slice(1))),
  };
  const sentOptions: Array<{ priority: number } | undefined> = [];
  const caller = new RpcRoom({
    transport: {
      ...pair.a.transport,
      send: (message, peerId, options?: { priority: number }) => {
        sentOptions.push(options);
        return pair.a.transport.send(message, peerId);
      },
    },
    codec,
    postOptions: { priority: 3 },
    runtime: {
      scheduleTimeout: scheduler.setTimeout,
      createId: () => "deterministic-request",
    },
  });
  cleanup.push(() => caller.close());
  const receiver = new RpcRoom({
    transport: pair.b.transport,
    codec,
    createAbortController: () => new AbortController(),
  });
  const nativeRoom: Room<JsonValue, AbortSignal> = receiver;
  cleanup.push(() => nativeRoom.close());
  nativeRoom.registerCancellable("db.echo", (ctx, peerId, value: JsonValue) => {
    expect(ctx.signal).toBeInstanceOf(AbortSignal);
    expect(peerId).toBe("peer-a");
    return value;
  });
  await expect(caller.session("peer-b").call("db.echo", [7])).resolves.toBe(7);
  expect(scheduler.pendingCount).toBe(0);
  expect(sentOptions).toEqual([{ priority: 3 }]);
  expect(codec.encode).toHaveBeenCalledWith(
    expect.objectContaining({ requestId: "deterministic-request" }),
  );
  expect(codec.encode).toHaveBeenCalledTimes(2);
  expect(codec.decode).toHaveBeenCalledTimes(2);
});

it("settles codec failures and removes the outbound wait", async () => {
  const pair = createLegacyPair();
  cleanup.push(() => pair.wire.dispose());
  const scheduler = createControllableScheduler();
  cleanup.push(() => scheduler.dispose());
  const failure = new Error("encode failed");
  const room = new RpcRoom({
    transport: pair.a.transport,
    runtime: { scheduleTimeout: scheduler.setTimeout },
    codec: {
      encode: () => {
        throw failure;
      },
      decode: createJsonCodec().decode,
    },
  });
  cleanup.push(() => room.close());
  await expect(room.session("peer-b").call("db.read")).rejects.toBe(failure);
  expect(scheduler.pendingCount).toBe(0);
  expect(pair.wire.a.sentMessages).toHaveLength(0);
});

it("keeps P2P bundles free of experimental Worker and stream machinery", async () => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL("../src/p2p.ts", import.meta.url))],
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    metafile: true,
    write: false,
  });
  expect(Object.values(result.metafile.outputs)[0]!.imports).toEqual([]);
  const inputs = Object.keys(result.metafile.inputs).join("\n");
  expect(inputs).not.toMatch(/src\/(worker|endpoint|transfer)\.ts/);
  expect(inputs).not.toMatch(/livesync-commonlib|pouchdb|trystero/);
});
