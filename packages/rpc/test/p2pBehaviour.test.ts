import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RpcError as P2PRpcError, RpcRoom as P2PRpcRoom } from "../src/p2p.js";
import { createLegacyPair } from "./compatibility/legacyPair.js";
import type {
  LegacyFactoryOptions,
  LegacyRoomFactory,
  LegacyWire,
} from "./compatibility/legacyTypes.js";
import { createControllableScheduler } from "./facilities/controllableScheduler.js";
import type { ControllableScheduler } from "./facilities/controllableScheduler.js";
import {
  RpcError as LegacyRpcError,
  RpcRoom as LegacyRpcRoom,
} from "./fixtures/commonlib-0.5.0/reference.mjs";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function createP2PRoom(
  options: LegacyFactoryOptions,
  scheduler?: ControllableScheduler,
) {
  return new P2PRpcRoom({
    ...options,
    ...(scheduler === undefined
      ? {}
      : { runtime: { scheduleTimeout: scheduler.setTimeout } }),
    createAbortController: () => new AbortController(),
  });
}

const legacyFactory: LegacyRoomFactory = (options) =>
  new LegacyRpcRoom(options);
const p2pFactory: LegacyRoomFactory = (options) => createP2PRoom(options);

async function observeInboundCollision(roomFactory: LegacyRoomFactory) {
  const pair = createLegacyPair();
  const firstPeer = { peerId: "left-client", instanceId: "left-instance" };
  const secondPeer = { peerId: "right-client", instanceId: "right-instance" };
  const room = roomFactory({ transport: pair.b.transport });
  const firstEntered = deferred<void>();
  const secondEntered = deferred<void>();
  const releaseFirst = deferred<null>();
  const releaseSecond = deferred<null>();
  const firstFinished = deferred<void>();
  const secondFinished = deferred<void>();
  const signals = new Map<string, AbortSignal>();
  try {
    room.registerCancellable("db.wait", async (context, peerId) => {
      signals.set(peerId, context.signal);
      if (peerId === firstPeer.peerId) {
        firstEntered.resolve();
        try {
          return await releaseFirst.promise;
        } finally {
          firstFinished.resolve();
        }
      }
      secondEntered.resolve();
      try {
        return await releaseSecond.promise;
      } finally {
        secondFinished.resolve();
      }
    });
    const request: LegacyWire = {
      wire: "raw",
      payload: JSON.stringify({
        kind: "request",
        requestId: "shared-request-id",
        method: "db.wait",
        args: [],
        expectsResponse: false,
      }),
    };
    pair.wire.b.injectInbound(firstPeer, request);
    pair.wire.b.injectInbound(secondPeer, request);
    await Promise.all([firstEntered.promise, secondEntered.promise]);

    pair.wire.b.injectInbound(firstPeer, {
      wire: "raw",
      payload: JSON.stringify({
        kind: "cancel",
        requestId: "shared-request-id",
      }),
    });
    const result = {
      firstAborted: signals.get(firstPeer.peerId)?.aborted ?? false,
      secondAborted: signals.get(secondPeer.peerId)?.aborted ?? false,
    };
    releaseFirst.resolve(null);
    releaseSecond.resolve(null);
    await Promise.all([firstFinished.promise, secondFinished.promise]);
    return result;
  } finally {
    releaseFirst.resolve(null);
    releaseSecond.resolve(null);
    room.close();
    pair.wire.dispose();
  }
}

describe("P2P behavioural regressions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    const remainingTimers = vi.getTimerCount();
    vi.useRealTimers();
    expect(remainingTimers).toBe(0);
  });

  describe("pinned legacy baseline", () => {
    it("settles a call from a response sent by a peer other than the session target", async () => {
      const pair = createLegacyPair();
      const room = new LegacyRpcRoom({ transport: pair.a.transport });
      try {
        const result = room
          .session(pair.wire.a.remotePeer.peerId)
          .call("legacy/value", [], 0);
        const rawRequest = pair.wire.a.sentMessages.find(
          ({ payload }) => payload.wire === "raw",
        )?.payload;
        if (!rawRequest || rawRequest.wire !== "raw") {
          throw new Error("Expected the legacy room to send a raw request.");
        }
        const requestId = (
          JSON.parse(rawRequest.payload) as { requestId: string }
        ).requestId;

        pair.wire.a.injectInbound(
          { peerId: "unrelated-peer", instanceId: "unrelated-instance" },
          {
            wire: "raw",
            payload: JSON.stringify({
              kind: "response",
              requestId,
              ok: true,
              data: "unrelated response",
            }),
          },
        );

        await expect(result).resolves.toBe("unrelated response");
      } finally {
        room.close();
        pair.wire.dispose();
      }
    });

    it("keeps an incomplete chunk wait alive after the sender leaves", async () => {
      const pair = createLegacyPair();
      const room = new LegacyRpcRoom({
        transport: pair.b.transport,
        chunkMissingRetryMs: 350,
      });
      try {
        pair.wire.b.injectInbound(pair.wire.b.remotePeer, {
          wire: "chunk",
          streamId: "unfinished-stream",
          index: 0,
          total: 2,
          payload: "partial",
        });
        expect(vi.getTimerCount()).toBe(1);

        pair.b.leave();
        expect(vi.getTimerCount()).toBe(1);
        await vi.advanceTimersByTimeAsync(350);
        expect(
          pair.wire.b.sentMessages.some(
            ({ payload }) =>
              payload.wire === "chunk-ack" &&
              payload.streamId === "unfinished-stream",
          ),
        ).toBe(true);
      } finally {
        room.close();
        pair.wire.dispose();
      }
    });

    it("cannot cancel an earlier peer's operation after request IDs collide", async () => {
      await expect(observeInboundCollision(legacyFactory)).resolves.toEqual({
        firstAborted: false,
        secondAborted: false,
      });
    });
  });

  it("ignores a response from a peer other than the session target", async () => {
    const pair = createLegacyPair();
    const peerId = pair.wire.a.remotePeer.peerId;
    const room = createP2PRoom({ transport: pair.a.transport });
    try {
      const result = room.session(peerId).call("legacy/value", [], 0);
      const rawRequest = pair.wire.a.sentMessages.find(
        ({ payload }) => payload.wire === "raw",
      )?.payload;
      if (!rawRequest || rawRequest.wire !== "raw") {
        throw new Error("Expected the room to send a raw request.");
      }
      const requestId = (
        JSON.parse(rawRequest.payload) as { requestId: string }
      ).requestId;

      pair.wire.a.injectInbound(
        { peerId: "unrelated-peer", instanceId: "unrelated-instance" },
        {
          wire: "raw",
          payload: JSON.stringify({
            kind: "response",
            requestId,
            ok: true,
            data: "unrelated response",
          }),
        },
      );
      pair.wire.a.injectInbound(pair.wire.a.remotePeer, {
        wire: "raw",
        payload: JSON.stringify({
          kind: "response",
          requestId,
          ok: true,
          data: "expected response",
        }),
      });

      await expect(result).resolves.toBe("expected response");
    } finally {
      room.close();
      pair.wire.dispose();
    }
  });

  it("clears incoming chunk state and its wait when the sender leaves", () => {
    const pair = createLegacyPair();
    const scheduler = createControllableScheduler();
    const room = createP2PRoom(
      { transport: pair.b.transport, chunkMissingRetryMs: 350 },
      scheduler,
    );
    try {
      const streamId = "reused-stream";
      pair.wire.b.injectInbound(pair.wire.b.remotePeer, {
        wire: "chunk",
        streamId,
        index: 0,
        total: 2,
        payload: "old-part",
      });
      expect(scheduler.pendingCount).toBe(1);

      pair.b.leave();
      expect(scheduler.pendingCount).toBe(0);
      pair.b.join();
      pair.wire.b.injectInbound(pair.wire.b.remotePeer, {
        wire: "chunk",
        streamId,
        index: 1,
        total: 2,
        payload: "new-part",
      });
      expect(scheduler.pendingCount).toBe(1);

      scheduler.advanceBy(350);
      expect(
        pair.wire.b.sentMessages
          .map(({ payload }) => payload)
          .filter(
            (payload): payload is Extract<LegacyWire, { wire: "chunk-ack" }> =>
              payload.wire === "chunk-ack" && payload.streamId === streamId,
          ),
      ).toEqual([{ wire: "chunk-ack", streamId, missing: [0] }]);
    } finally {
      room.close();
      expect(scheduler.pendingCount).toBe(0);
      scheduler.dispose();
      pair.wire.dispose();
    }
  });

  it("keeps colliding request IDs scoped to their sender when cancelling", async () => {
    await expect(observeInboundCollision(p2pFactory)).resolves.toEqual({
      firstAborted: true,
      secondAborted: false,
    });
  });

  it("serialises a registered method across calls", async () => {
    const pair = createLegacyPair();
    const scheduler = createControllableScheduler();
    const caller = createP2PRoom({ transport: pair.a.transport }, scheduler);
    const secondAdmitted = deferred<void>();
    let admitted = 0;
    const receiver = createP2PRoom(
      {
        transport: pair.b.transport,
        canAcceptRequest: (_peer, method) => {
          if (method === "db.serial") {
            admitted += 1;
            if (admitted === 2) {
              secondAdmitted.resolve();
            }
          }
          return true;
        },
      },
      scheduler,
    );
    const firstStarted = deferred<void>();
    const secondStarted = deferred<void>();
    const releaseFirst = deferred<string>();
    const releaseSecond = deferred<string>();
    const invoked: string[] = [];
    try {
      receiver.register(
        "db.serial",
        async (_peer, label: string) => {
          invoked.push(label);
          if (label === "first") {
            firstStarted.resolve();
            return await releaseFirst.promise;
          }
          secondStarted.resolve();
          return await releaseSecond.promise;
        },
        { serial: true },
      );
      const firstCall = caller
        .session(pair.wire.a.remotePeer.peerId)
        .call<string>("db.serial", ["first"]);
      await firstStarted.promise;
      const secondCall = caller
        .session(pair.wire.a.remotePeer.peerId)
        .call<string>("db.serial", ["second"]);
      await secondAdmitted.promise;
      await Promise.resolve();
      expect(invoked).toEqual(["first"]);

      releaseFirst.resolve("first result");
      await expect(firstCall).resolves.toBe("first result");
      await secondStarted.promise;
      expect(invoked).toEqual(["first", "second"]);
      releaseSecond.resolve("second result");
      await expect(secondCall).resolves.toBe("second result");
    } finally {
      releaseFirst.resolve("released");
      releaseSecond.resolve("released");
      caller.close();
      receiver.close();
      expect(scheduler.pendingCount).toBe(0);
      scheduler.dispose();
      pair.wire.dispose();
    }
  });

  const errorCases: Array<{
    label: string;
    callerFactory: LegacyRoomFactory;
    receiverFactory: LegacyRoomFactory;
    callerError: typeof LegacyRpcError | typeof P2PRpcError;
    receiverError: typeof LegacyRpcError | typeof P2PRpcError;
  }> = [
    {
      label: "legacy caller and P2P receiver",
      callerFactory: legacyFactory,
      receiverFactory: p2pFactory,
      callerError: LegacyRpcError,
      receiverError: P2PRpcError,
    },
    {
      label: "P2P caller and legacy receiver",
      callerFactory: p2pFactory,
      receiverFactory: legacyFactory,
      callerError: P2PRpcError,
      receiverError: LegacyRpcError,
    },
  ];

  for (const testCase of errorCases) {
    it(`preserves error details for ${testCase.label}`, async () => {
      const pair = createLegacyPair();
      const caller = testCase.callerFactory({ transport: pair.a.transport });
      const receiver = testCase.receiverFactory({
        transport: pair.b.transport,
      });
      const details = {
        retryable: false,
        operation: "read",
        identifiers: ["one", "two"],
      };
      try {
        receiver.register("db.fail", () => {
          throw new testCase.receiverError(
            "REMOTE_ERROR",
            "remote failure with details",
            details,
          );
        });
        const error = await caller
          .session(pair.wire.a.remotePeer.peerId)
          .call("db.fail")
          .catch((cause: unknown) => cause);

        expect(error).toBeInstanceOf(testCase.callerError);
        expect(error).toMatchObject({
          code: "REMOTE_ERROR",
          message: "remote failure with details",
          details,
        });
      } finally {
        caller.close();
        receiver.close();
        pair.wire.dispose();
      }
    });
  }

  it("requests missing chunks again after a quiet period", async () => {
    const pair = createLegacyPair();
    const scheduler = createControllableScheduler();
    const caller = createP2PRoom(
      {
        transport: pair.a.transport,
        maxWirePayloadBytes: 96,
        chunkMissingRetryMs: 350,
      },
      scheduler,
    );
    const receiver = createP2PRoom(
      {
        transport: pair.b.transport,
        maxWirePayloadBytes: 96,
        chunkMissingRetryMs: 350,
      },
      scheduler,
    );
    try {
      pair.wire.a.setDeliveryMode({ kind: "manual" });
      await caller
        .session(pair.wire.a.remotePeer.peerId)
        .notify("db.large", ["x".repeat(1024)]);
      const initialChunks = pair.wire.a.sentMessages
        .map(({ payload }) => payload)
        .filter(
          (payload): payload is Extract<LegacyWire, { wire: "chunk" }> =>
            payload.wire === "chunk",
        );
      expect(initialChunks.length).toBeGreaterThan(2);
      const initialCount = pair.wire.a.sentMessages.length;
      expect(pair.wire.a.flushNext()).toBe(true);
      expect(scheduler.pendingCount).toBe(1);

      scheduler.advanceBy(350);
      const retransmissions = pair.wire.a.sentMessages
        .slice(initialCount)
        .map(({ payload }) => payload)
        .filter(
          (payload): payload is Extract<LegacyWire, { wire: "chunk" }> =>
            payload.wire === "chunk",
        );
      expect(retransmissions.some((chunk) => chunk.index === 1)).toBe(true);
    } finally {
      caller.close();
      receiver.close();
      expect(scheduler.pendingCount).toBe(0);
      scheduler.dispose();
      pair.wire.dispose();
    }
  });

  it("rejects requests after a remote protocol major mismatch", async () => {
    const pair = createLegacyPair();
    const caller = createP2PRoom({ transport: pair.a.transport });
    const receiver = createP2PRoom({ transport: pair.b.transport });
    const handler = vi.fn(() => "unexpected");
    try {
      receiver.register("db.value", handler);
      pair.wire.b.injectInbound(pair.wire.b.remotePeer, {
        wire: "raw",
        payload: JSON.stringify({
          kind: "handshake",
          versionMajor: 2,
          versionMinor: 0,
        }),
      });

      const error = await caller
        .session(pair.wire.a.remotePeer.peerId)
        .call("db.value", [], 0)
        .catch((cause: unknown) => cause);
      expect(error).toBeInstanceOf(P2PRpcError);
      expect(error).toMatchObject({
        code: "REMOTE_ERROR",
        message: "RPC major mismatch: local=1, remote=2",
      });
      expect(handler).not.toHaveBeenCalled();
    } finally {
      caller.close();
      receiver.close();
      pair.wire.dispose();
    }
  });

  it("rejects pending calls and aborts handlers when the caller's room closes", async () => {
    const pair = createLegacyPair();
    const scheduler = createControllableScheduler();
    const caller = createP2PRoom({ transport: pair.a.transport }, scheduler);
    const receiver = createP2PRoom({ transport: pair.b.transport }, scheduler);
    const entered = deferred<AbortSignal>();
    const aborted = deferred<void>();
    const release = deferred<string>();
    const finished = deferred<void>();
    try {
      receiver.registerCancellable("db.wait", async (context) => {
        context.signal.addEventListener("abort", () => aborted.resolve(), {
          once: true,
        });
        entered.resolve(context.signal);
        try {
          return await release.promise;
        } finally {
          finished.resolve();
        }
      });
      const call = caller
        .session(pair.wire.a.remotePeer.peerId)
        .call<string>("db.wait", [], 0);
      const signal = await entered.promise;
      const rejection = call.catch((cause: unknown) => cause);
      caller.close();

      const error = await rejection;
      await aborted.promise;
      expect(error).toBeInstanceOf(P2PRpcError);
      expect(error).toMatchObject({ code: "NOT_CONNECTED" });
      expect(signal.aborted).toBe(true);

      release.resolve("late result");
      await finished.promise;
    } finally {
      release.resolve("released");
      caller.close();
      receiver.close();
      expect(scheduler.pendingCount).toBe(0);
      scheduler.dispose();
      pair.wire.dispose();
    }
  });
});
