import { describe, expect, it, vi } from "vitest";
import type { TimeoutScheduler } from "octagonal-wheels/concurrency/deferredAction";
import { createPendingInvocations } from "../src/p2p/pendingInvocations.js";
import { RpcRoom } from "../src/p2p.js";
import type { RpcEnvelope } from "../src/p2p/types.js";
import { createLegacyPair } from "./compatibility/legacyPair.js";

function createScheduler() {
  const entries: {
    callback: () => void;
    cancel: ReturnType<typeof vi.fn>;
  }[] = [];
  const scheduleTimeout = vi.fn<TimeoutScheduler>((callback) => {
    const cancel = vi.fn();
    entries.push({ callback, cancel });
    return cancel;
  });
  return { entries, scheduleTimeout };
}

function createSignal() {
  let aborted = false;
  const listeners = new Set<() => void>();
  const signal = {
    get aborted() {
      return aborted;
    },
    listeners,
    addEventListener: vi.fn((_type: "abort", listener: () => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_type: "abort", listener: () => void) => {
      listeners.delete(listener);
    }),
    abort() {
      if (aborted) return;
      aborted = true;
      for (const listener of [...listeners]) listener();
    },
  };
  return signal;
}

function createOwner(
  scheduleTimeout: TimeoutScheduler,
  onProtocolWarning?: (message: string, peerId: string) => void,
) {
  let nextRequestId = 0;
  const sendEnvelope = vi.fn(
    async (_peerId: string, _envelope: RpcEnvelope) => undefined,
  );
  const pending = createPendingInvocations({
    sendEnvelope,
    createRequestId: () => `request-${++nextRequestId}`,
    scheduleTimeout,
    ...(onProtocolWarning === undefined ? {} : { onProtocolWarning }),
  });
  return { pending, sendEnvelope };
}

describe("P2P pending call setup", () => {
  it("preserves a scheduler failure and sends no request", async () => {
    const error = new Error("scheduler setup failed");
    let scheduledCallback: (() => void) | undefined;
    const scheduleTimeout = vi.fn<TimeoutScheduler>((callback) => {
      scheduledCallback = callback;
      throw error;
    });
    const { pending, sendEnvelope } = createOwner(scheduleTimeout);

    const call = pending.invoke("peer-a", "data.read", [], { timeoutMs: 20 });

    await expect(call).rejects.toBe(error);
    expect(sendEnvelope).not.toHaveBeenCalled();
    scheduledCallback?.();
    expect(sendEnvelope).not.toHaveBeenCalled();
  });

  it("releases the deadline and listener when abort listener setup throws", async () => {
    const error = new Error("listener setup failed");
    const scheduler = createScheduler();
    const { pending, sendEnvelope } = createOwner(
      scheduler.scheduleTimeout,
    );
    const signal = createSignal();
    signal.addEventListener.mockImplementation((_type, listener) => {
      signal.listeners.add(listener);
      throw error;
    });

    const call = pending.invoke("peer-a", "data.read", [], {
      timeoutMs: 20,
      signal,
    });

    await expect(call).rejects.toBe(error);
    expect(sendEnvelope).not.toHaveBeenCalled();
    expect(scheduler.entries).toHaveLength(1);
    expect(scheduler.entries[0]!.cancel).toHaveBeenCalledTimes(1);
    expect(signal.listeners.size).toBe(0);

    pending.receiveResponse(
      { kind: "response", requestId: "request-1", ok: true, data: null },
      "peer-a",
    );
    expect(signal.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it("preserves the listener setup error when listener cleanup also throws", async () => {
    const setupError = new Error("listener setup failed");
    const cleanupError = new Error("listener cleanup failed");
    const warnings: string[] = [];
    const scheduler = createScheduler();
    const { pending, sendEnvelope } = createOwner(
      scheduler.scheduleTimeout,
      (message) => warnings.push(message),
    );
    const signal = createSignal();
    signal.addEventListener.mockImplementation((_type, listener) => {
      signal.listeners.add(listener);
      throw setupError;
    });
    signal.removeEventListener.mockImplementation((_type, listener) => {
      signal.listeners.delete(listener);
      throw cleanupError;
    });

    const call = pending.invoke("peer-a", "data.read", [], {
      timeoutMs: 20,
      signal,
    });

    await expect(call).rejects.toBe(setupError);
    expect(sendEnvelope).not.toHaveBeenCalled();
    expect(scheduler.entries[0]!.cancel).toHaveBeenCalledTimes(1);
    expect(signal.listeners.size).toBe(0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(String(cleanupError));
  });

  it("does not send after peer departure re-enters deadline setup", async () => {
    let pending!: ReturnType<typeof createOwner>["pending"];
    const cancel = vi.fn();
    const scheduleTimeout = vi.fn<TimeoutScheduler>(() => {
      pending.peerLeft("peer-a");
      return cancel;
    });
    const created = createOwner(scheduleTimeout);
    pending = created.pending;

    const call = pending.invoke("peer-a", "data.read", [], { timeoutMs: 20 });
    pending.peerLeft("peer-a");

    await expect(call).rejects.toMatchObject({ code: "NOT_CONNECTED" });
    expect(created.sendEnvelope).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("does not send when abort is dispatched during listener setup", async () => {
    const scheduler = createScheduler();
    const { pending, sendEnvelope } = createOwner(
      scheduler.scheduleTimeout,
    );
    const signal = createSignal();
    signal.addEventListener.mockImplementation((_type, listener) => {
      signal.listeners.add(listener);
      signal.abort();
    });

    const call = pending.invoke("peer-a", "data.read", [], {
      timeoutMs: 20,
      signal,
    });

    await expect(call).rejects.toMatchObject({ code: "CANCELLED" });
    expect(sendEnvelope).not.toHaveBeenCalled();
    expect(scheduler.entries[0]!.cancel).toHaveBeenCalledTimes(1);
    expect(signal.listeners.size).toBe(0);
  });

  it("settles every wait on close when one abort listener cannot be removed", async () => {
    const cleanupError = new Error("listener cleanup failed");
    const warnings: string[] = [];
    const { pending, sendEnvelope } = createOwner(
      vi.fn<TimeoutScheduler>(),
      (message) => warnings.push(message),
    );
    const firstSignal = createSignal();
    const secondSignal = createSignal();
    firstSignal.removeEventListener.mockImplementation((_type, listener) => {
      firstSignal.listeners.delete(listener);
      throw cleanupError;
    });
    const first = pending.invoke("peer-a", "data.first", [], { timeoutMs: 0, signal: firstSignal });
    const second = pending.invoke("peer-a", "data.second", [], { timeoutMs: 0, signal: secondSignal });
    await Promise.resolve();
    pending.close();
    for (const call of [first, second]) {
      await expect(call).rejects.toMatchObject({ code: "NOT_CONNECTED" });
    }
    expect(firstSignal.listeners.size).toBe(0);
    expect(secondSignal.listeners.size).toBe(0);
    expect(firstSignal.removeEventListener).toHaveBeenCalledTimes(1);
    expect(secondSignal.removeEventListener).toHaveBeenCalledTimes(1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(String(cleanupError));
    expect(sendEnvelope.mock.calls.map(([, envelope]) => envelope.kind)).toEqual([
      "request",
      "request",
      "cancel",
      "cancel",
    ]);
  });

  it("settles a response when abort listener removal throws", async () => {
    const cleanupError = new Error("listener cleanup failed");
    let warningCalls = 0;
    const sendEnvelope = vi.fn(
      async (_peerId: string, _envelope: RpcEnvelope) => undefined,
    );
    const pending = createPendingInvocations({
      sendEnvelope,
      createRequestId: () => "reused-request",
      scheduleTimeout: vi.fn<TimeoutScheduler>(),
      onProtocolWarning: () => {
        warningCalls++;
        throw new Error("warning observer failed");
      },
    });
    const staleSignal = createSignal();
    staleSignal.removeEventListener.mockImplementation(() => {
      throw cleanupError;
    });
    const firstCall = pending.invoke("peer-a", "data.first", [], {
      timeoutMs: 0,
      signal: staleSignal,
    });

    expect(() =>
      pending.receiveResponse(
        {
          kind: "response",
          requestId: "reused-request",
          ok: true,
          data: 42,
        },
        "peer-a",
      ),
    ).not.toThrow();

    await expect(firstCall).resolves.toBe(42);
    expect(staleSignal.listeners.size).toBe(1);

    const nextSignal = createSignal();
    const nextCall = pending.invoke("peer-a", "data.second", [], {
      timeoutMs: 0,
      signal: nextSignal,
    });
    await Promise.resolve();
    staleSignal.abort();
    expect(sendEnvelope.mock.calls.map(([, envelope]) => envelope.kind)).toEqual([
      "request",
      "request",
    ]);
    pending.receiveResponse(
      {
        kind: "response",
        requestId: "reused-request",
        ok: true,
        data: 43,
      },
      "peer-a",
    );

    await expect(nextCall).resolves.toBe(43);
    expect(nextSignal.listeners.size).toBe(0);
    expect(warningCalls).toBe(1);
  });

  it("settles a public room call when its deadline canceller throws", async () => {
    const pair = createLegacyPair();
    const cancelError = new Error("deadline cancellation failed");
    const warnings: string[] = [];
    const scheduleTimeout = vi.fn<TimeoutScheduler>(() => () => {
      throw cancelError;
    });
    const room = new RpcRoom({
      transport: pair.a.transport,
      runtime: {
        scheduleTimeout,
        createId: () => "room-request",
      },
      onProtocolWarning: (message) => warnings.push(message),
    });
    try {
      const call = room.session("peer-b").call("data.read", [], {
        timeoutMs: 20,
      });
      pair.wire.a.injectInbound(pair.wire.b.localPeer, {
        wire: "raw",
        payload: JSON.stringify({
          kind: "response",
          requestId: "room-request",
          ok: true,
          data: 42,
        }),
      });

      await expect(call).resolves.toBe(42);
      expect(scheduleTimeout).toHaveBeenCalledTimes(1);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain(String(cancelError));
    } finally {
      room.close();
      pair.wire.dispose();
    }
  });
});
