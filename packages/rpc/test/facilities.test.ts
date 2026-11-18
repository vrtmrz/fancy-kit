import { describe, expect, it } from "vitest";
import { createControllableScheduler } from "./facilities/controllableScheduler.js";
import { createDeterministicIdSource } from "./facilities/deterministicIds.js";
import { createPairedFakeTransport } from "./facilities/pairedFakeTransport.js";

describe("ControllableScheduler and DeterministicIdSource", () => {
  it("executes timers deterministically in timestamp order and leaves none after dispose", () => {
    const scheduler = createControllableScheduler();
    const order: string[] = [];

    const cancelB = scheduler.setTimeout(() => order.push("b@50"), 50);
    scheduler.setTimeout(() => order.push("a@20"), 20);
    scheduler.setTimeout(() => order.push("c@50"), 50);
    cancelB();

    expect(scheduler.pendingCount).toBe(2);
    expect(scheduler.advanceBy(20)).toBe(1);
    expect(order).toEqual(["a@20"]);
    expect(scheduler.now).toBe(20);

    scheduler.setTimeout(() => order.push("d@100"), 80);
    expect(scheduler.advanceBy(40)).toBe(1);
    expect(order).toEqual(["a@20", "c@50"]);
    expect(scheduler.pendingCount).toBe(1);

    scheduler.dispose();
    expect(scheduler.pendingCount).toBe(0);
    expect(scheduler.runAll()).toBe(0);
  });

  it("generates deterministic sequential IDs and supports reset", () => {
    const ids = createDeterministicIdSource("req");
    expect(ids.next()).toBe("req-1");
    expect(ids.next()).toBe("req-2");
    expect(ids.count).toBe(2);
    ids.reset();
    expect(ids.next()).toBe("req-1");
  });
});

describe("PairedFakeTransport", () => {
  it("supports synchronous and scheduler-delayed delivery", async () => {
    const pair = createPairedFakeTransport<string>({
      initialDeliveryMode: { kind: "sync" },
    });
    const receivedByB: Array<{ peerId: string; instanceId: string; payload: unknown }> = [];
    pair.b.subscribe((from, payload) => {
      receivedByB.push({ ...from, payload });
    });

    await pair.a.send(pair.b.localPeer, "sync-hello");
    expect(receivedByB).toEqual([
      { ...pair.a.localPeer, payload: "sync-hello" },
    ]);

    pair.a.setDeliveryMode({ kind: "delayed", delayMs: 25 });
    await pair.a.send(pair.b.localPeer, "delayed-hello");
    expect(receivedByB).toHaveLength(1);
    expect(pair.a.pendingDeliveryCount).toBe(1);

    pair.scheduler.advanceBy(25);
    expect(receivedByB).toEqual([
      { ...pair.a.localPeer, payload: "sync-hello" },
      { ...pair.a.localPeer, payload: "delayed-hello" },
    ]);

    pair.dispose();
    expect(pair.hasPendingWork()).toBe(false);
  });

  it("supports throw, reject-before-delivery, reject-after-delivery, disconnect, and stale/wrong-peer injection", async () => {
    const pair = createPairedFakeTransport<string>({
      initialDeliveryMode: { kind: "sync" },
    });
    const receivedByB: Array<{ from: string; instance: string; payload: unknown }> = [];
    pair.b.subscribe((from, payload) => {
      receivedByB.push({
        from: from.peerId,
        instance: from.instanceId,
        payload,
      });
    });

    pair.a.queueNextSendFault({ kind: "throw", error: new Error("sync boom") });
    expect(() => pair.a.send(pair.b.localPeer, "never-sent")).toThrow("sync boom");
    expect(receivedByB).toHaveLength(0);

    pair.a.queueNextSendFault({
      kind: "reject-before-delivery",
      error: new Error("pre-send reject"),
    });
    await expect(pair.a.send(pair.b.localPeer, "dropped")).rejects.toThrow("pre-send reject");
    expect(receivedByB).toHaveLength(0);

    pair.a.queueNextSendFault({
      kind: "reject-after-delivery",
      error: new Error("post-delivery reject"),
    });
    await expect(pair.a.send(pair.b.localPeer, "delivered-then-rejected")).rejects.toThrow(
      "post-delivery reject",
    );
    expect(receivedByB).toEqual([
      {
        from: pair.a.localPeer.peerId,
        instance: pair.a.localPeer.instanceId,
        payload: "delivered-then-rejected",
      },
    ]);

    pair.b.injectInbound({ peerId: "peer-a", instanceId: "stale-inst" }, "stale-msg");
    pair.b.injectInbound({ peerId: "peer-intruder", instanceId: "inst-x" }, "wrong-peer-msg");
    expect(receivedByB.slice(1)).toEqual([
      { from: "peer-a", instance: "stale-inst", payload: "stale-msg" },
      { from: "peer-intruder", instance: "inst-x", payload: "wrong-peer-msg" },
    ]);

    pair.a.setDeliveryMode({ kind: "delayed", delayMs: 100 });
    await pair.a.send(pair.b.localPeer, "queued-before-disconnect");
    expect(pair.hasPendingWork()).toBe(true);

    pair.a.disconnect(new Error("transport closed"));
    await expect(pair.a.send(pair.b.localPeer, "after-disconnect")).rejects.toThrow(
      "transport closed",
    );
    expect(pair.a.hasPendingWork()).toBe(false);

    pair.dispose();
    expect(pair.hasPendingWork()).toBe(false);
    expect(pair.scheduler.pendingCount).toBe(0);
    expect(pair.a.listenerCount).toBe(0);
    expect(pair.b.listenerCount).toBe(0);
  });

  it("separates delivery timing from send() settlement and honours reject-after-delivery in manual mode", async () => {
    const pair = createPairedFakeTransport<string>({
      initialDeliveryMode: { kind: "manual" },
      initialSendSettlementMode: "manual",
    });
    const receivedByB: unknown[] = [];
    pair.b.subscribe((_from, payload) => {
      receivedByB.push(payload);
    });

    // 1. Send stays pending while both delivery and settlement are held.
    let settledFirst = false;
    const firstSend = pair.a.send(pair.b.localPeer, "pending-send")?.then(() => {
      settledFirst = true;
    });
    expect(pair.a.pendingDeliveryCount).toBe(1);
    expect(pair.a.pendingSendCount).toBe(1);
    expect(receivedByB).toEqual([]);

    // Deliver without settling send(), simulating cancel/timeout while send() is still awaiting completion.
    expect(pair.a.flushNext()).toBe(true);
    expect(receivedByB).toEqual(["pending-send"]);
    await Promise.resolve();
    expect(settledFirst).toBe(false);
    expect(pair.a.pendingSendCount).toBe(1);

    expect(pair.a.resolveNextSend()).toBe(true);
    await firstSend;
    expect(settledFirst).toBe(true);
    expect(pair.a.pendingSendCount).toBe(0);

    // 2. Manual delivery + reject-after-delivery must remain pending until flushNext() delivers.
    pair.a.setSendSettlementMode("immediate");
    pair.a.queueNextSendFault({
      kind: "reject-after-delivery",
      error: new Error("post-delivery failure"),
    });
    let secondOutcome: string = "pending";
    const secondSend = Promise.resolve(pair.a.send(pair.b.localPeer, "delivered-first")).then(
      () => {
        secondOutcome = "resolved";
      },
      (err: unknown) => {
        secondOutcome = err instanceof Error ? err.message : String(err);
      },
    );

    await Promise.resolve();
    expect(secondOutcome).toBe("pending");
    expect(receivedByB).toEqual(["pending-send"]);

    expect(pair.a.flushNext()).toBe(true);
    await secondSend;
    expect(receivedByB).toEqual(["pending-send", "delivered-first"]);
    expect(secondOutcome).toBe("post-delivery failure");

    // 3. Disconnect rejects any remaining manual send promises cleanly.
    pair.a.setSendSettlementMode("manual");
    const abortedSend = pair.a.send(pair.b.localPeer, "interrupted");
    expect(pair.a.pendingSendCount).toBe(1);
    pair.a.disconnect(new Error("disconnected during send"));
    await expect(abortedSend).rejects.toThrow("disconnected during send");

    pair.dispose();
    expect(pair.hasPendingWork()).toBe(false);
  });

  it("captures sendSettlementMode per send() call so later mode changes do not alter in-flight sends", async () => {
    const pair = createPairedFakeTransport<string>({
      initialDeliveryMode: { kind: "manual" },
      initialSendSettlementMode: "after-delivery",
    });
    const receivedByB: unknown[] = [];
    pair.b.subscribe((_from, payload) => {
      receivedByB.push(payload);
    });

    let firstSettled = false;
    const firstSend = Promise.resolve(pair.a.send(pair.b.localPeer, "first")).then(() => {
      firstSettled = true;
    });

    // Switch mode before the first send is flushed; firstSend must retain "after-delivery".
    pair.a.setSendSettlementMode("manual");

    let secondSettled = false;
    const secondSend = Promise.resolve(pair.a.send(pair.b.localPeer, "second")).then(() => {
      secondSettled = true;
    });

    expect(pair.a.pendingDeliveryCount).toBe(2);
    expect(pair.a.pendingSendCount).toBe(2);

    // Flushing the first message resolves firstSend immediately after delivery.
    expect(pair.a.flushNext()).toBe(true);
    await firstSend;
    expect(firstSettled).toBe(true);
    expect(receivedByB).toEqual(["first"]);
    expect(pair.a.pendingSendCount).toBe(1);
    expect(secondSettled).toBe(false);

    // Flushing the second message leaves secondSend pending under its captured "manual" mode.
    expect(pair.a.flushNext()).toBe(true);
    await Promise.resolve();
    expect(receivedByB).toEqual(["first", "second"]);
    expect(secondSettled).toBe(false);
    expect(pair.a.pendingSendCount).toBe(1);

    expect(pair.a.resolveNextSend()).toBe(true);
    await secondSend;
    expect(secondSettled).toBe(true);
    expect(pair.a.pendingSendCount).toBe(0);

    pair.dispose();
    expect(pair.hasPendingWork()).toBe(false);
  });
});
