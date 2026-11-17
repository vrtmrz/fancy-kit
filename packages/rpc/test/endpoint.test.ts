import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RpcError,
  call,
  createRpcEndpoint,
  defineContract,
  notify,
  type PeerAddress,
  type RpcCodec,
  type RpcDiagnosticEvent,
  type RpcEnvelope,
} from "../src/index.js";
import { createControllableScheduler } from "./facilities/controllableScheduler.js";
import { createDeterministicIdSource } from "./facilities/deterministicIds.js";
import { createPairedFakeTransport } from "./facilities/pairedFakeTransport.js";
import {
  createIdentityCodec,
  createJsonStringCodec,
  createTrackedCancelSource,
} from "./testHelpers.js";

const coreContract = defineContract({
  add: call<[a: number, b: number], number>(),
  flush: call<[], void>(),
  failSync: call<[], void>(),
  failAsync: call<[], void>(),
  echoValue: call<[payload: unknown], unknown>(),
  delayedValue: call<[tag: string], string>(),
  ping: notify<[sequence: number]>(),
});

interface CodecCase<Wire> {
  readonly name: string;
  readonly createCodec: () => RpcCodec<RpcEnvelope, Wire>;
  createInvalidPayload: () => unknown;
  createUnencodableValue: () => unknown;
}

const codecCases: readonly CodecCase<unknown>[] = [
  {
    name: "identity envelope codec",
    createCodec: () => createIdentityCodec(),
    createInvalidPayload: () => ({ version: 2, kind: "bogus" }),
    createUnencodableValue: () => {
      throw new Error("Unused for identity codec");
    },
  },
  {
    name: "JSON string codec",
    createCodec: () => createJsonStringCodec(),
    createInvalidPayload: () => "{not-valid-json",
    createUnencodableValue: () => 42n,
  },
];

describe("Unary RPC endpoint core", () => {
  const cleanups: Array<() => void | Promise<void>> = [];

  afterEach(async () => {
    while (cleanups.length > 0) {
      const cleanup = cleanups.pop()!;
      await cleanup();
    }
  });

  function createPairSetup<Wire>(
    codec: RpcCodec<RpcEnvelope, Wire>,
    options?: {
      readonly ownershipA?: "owned" | "borrowed";
      readonly ownershipB?: "owned" | "borrowed";
      readonly deliveryMode?: "sync" | "manual";
      readonly onDiagnosticA?: (event: RpcDiagnosticEvent) => void;
      readonly onDiagnosticB?: (event: RpcDiagnosticEvent) => void;
    },
  ) {
    const scheduler = createControllableScheduler();
    const pair = createPairedFakeTransport<Wire, undefined, never, false>({
      scheduler,
      initialDeliveryMode: { kind: options?.deliveryMode ?? "sync" },
    });
    const idsA = createDeterministicIdSource("reqA");
    const idsB = createDeterministicIdSource("reqB");
    const diagA: RpcDiagnosticEvent[] = [];
    const diagB: RpcDiagnosticEvent[] = [];

    const epA = createRpcEndpoint({
      contract: coreContract,
      codec,
      transport: pair.a,
      localPeer: pair.a.localPeer,
      transportOwnership: options?.ownershipA ?? "borrowed",
      scheduler,
      generateId: idsA.next,
      onDiagnostic: (event) => {
        diagA.push(event);
        options?.onDiagnosticA?.(event);
      },
    });
    const epB = createRpcEndpoint({
      contract: coreContract,
      codec,
      transport: pair.b,
      localPeer: pair.b.localPeer,
      transportOwnership: options?.ownershipB ?? "borrowed",
      scheduler,
      generateId: idsB.next,
      onDiagnostic: (event) => {
        diagB.push(event);
        options?.onDiagnosticB?.(event);
      },
    });

    cleanups.push(() => {
      epA.close();
      epB.close();
      pair.dispose();
    });

    return { scheduler, pair, epA, epB, idsA, idsB, diagA, diagB };
  }

  describe.each(codecCases)("shared contract suite with $name", (codecCase) => {
    it("registers wait before sending so synchronous delivery resolves cleanly", async () => {
      const { scheduler, pair, epA, epB, diagA } = createPairSetup(codecCase.createCodec(), {
        deliveryMode: "sync",
      });
      epB.handle("add", (_ctx, a, b) => a + b);
      epB.handle("flush", () => undefined);

      const client = epA.bindPeer(pair.b.localPeer);
      const cancelSource = createTrackedCancelSource();

      const sum = await client.call.add([19, 23], {
        timeoutMs: 100,
        signal: cancelSource.signal,
      });
      expect(sum).toBe(42);

      // Call<void> accepts both zero arguments and explicit empty tuple.
      await expect(client.call.flush()).resolves.toBeUndefined();
      await expect(client.call.flush([])).resolves.toBeUndefined();

      // Baseline cleanup: timers, abort listeners, pending calls, and no extra retries.
      expect(scheduler.pendingCount).toBe(0);
      expect(cancelSource.activeListenerCount).toBe(0);
      expect(pair.a.sentMessages).toHaveLength(3);
      expect(diagA).toEqual([]);
      expect(pair.a.pendingDeliveryCount).toBe(0);
      expect(pair.b.pendingDeliveryCount).toBe(0);
    });

    it("propagates synchronous and asynchronous handler errors with remoteName", async () => {
      const { pair, epA, epB, diagB } = createPairSetup(codecCase.createCodec(), {
        deliveryMode: "sync",
      });
      epB.handle("failSync", () => {
        throw new RangeError("sync-failure");
      });
      epB.handle("failAsync", async () => {
        throw new RpcError("invalid-contract", "explicit-rpc-error");
      });

      const client = epA.bindPeer(pair.b.localPeer);

      await expect(client.call.failSync()).rejects.toMatchObject({
        name: "RpcError",
        code: "remote-error",
        message: "sync-failure",
        remoteName: "RangeError",
        peer: pair.b.localPeer,
      });

      await expect(client.call.failAsync()).rejects.toMatchObject({
        name: "RpcError",
        code: "invalid-contract",
        message: "explicit-rpc-error",
        peer: pair.b.localPeer,
      });

      expect(diagB.filter((e) => e.type === "handler-error")).toHaveLength(2);
      expect(pair.a.sentMessages).toHaveLength(2);
    });

    it("rejects unavailable methods and handles notifications with explicit no-response", async () => {
      const { pair, epA, epB, diagB } = createPairSetup(codecCase.createCodec(), {
        deliveryMode: "sync",
      });
      const client = epA.bindPeer(pair.b.localPeer);

      // Missing handler triggers method-not-found from receiver.
      await expect(client.call.add([1, 2])).rejects.toMatchObject({
        code: "method-not-found",
      });

      // Unknown contract method rejected on inbound request envelope.
      pair.b.injectInbound(
        pair.a.localPeer,
        codecCase.createCodec().encode({
          kind: "request",
          version: 1,
          requestId: "raw-unknown",
          sender: pair.a.localPeer,
          target: pair.b.localPeer,
          method: "noSuchMethod",
          args: [],
        }),
      );
      expect(pair.a.sentMessages).toHaveLength(1);
      // Wait for response sent from B to A:
      expect(pair.b.sentMessages).toHaveLength(2);
      const lastFromB = codecCase.createCodec().decode(pair.b.sentMessages[1]!.payload);
      expect(lastFromB).toMatchObject({
        kind: "response",
        requestId: "raw-unknown",
        ok: false,
        error: { code: "method-not-found" },
      });

      // Notification-only method rejects response-bearing request envelope.
      epB.handle("ping", () => undefined);
      pair.b.injectInbound(
        pair.a.localPeer,
        codecCase.createCodec().encode({
          kind: "request",
          version: 1,
          requestId: "notify-as-call",
          sender: pair.a.localPeer,
          target: pair.b.localPeer,
          method: "ping",
          args: [7],
        }),
      );
      expect(pair.b.sentMessages).toHaveLength(3);
      const rejectNotifyReq = codecCase.createCodec().decode(pair.b.sentMessages[2]!.payload);
      expect(rejectNotifyReq).toMatchObject({
        kind: "response",
        requestId: "notify-as-call",
        ok: false,
        error: { code: "invalid-contract" },
      });

      // Notifications send zero response frames even when handler throws or is absent.
      const sentBeforeNotify = pair.b.sentMessages.length;
      const receivedPings: number[] = [];
      const unregisterPing = epB.handle("ping", (ctx, seq) => {
        expect(ctx.isNotification).toBe(true);
        receivedPings.push(seq);
        if (seq === 2) {
          throw new Error("notify-handler-boom");
        }
      });
      await expect(client.notify.ping([1])).resolves.toBeUndefined();
      await expect(client.notify.ping([2])).resolves.toBeUndefined();
      unregisterPing();
      // Unregistered notify admission failure still produces no response frame and emits diagnostic.
      await expect(client.notify.ping([3])).resolves.toBeUndefined();

      expect(receivedPings).toEqual([1, 2]);
      expect(pair.b.sentMessages).toHaveLength(sentBeforeNotify);
      expect(diagB.filter((e) => e.type === "handler-error")).toHaveLength(2);
    });

    it("rejects invalid envelopes cleanly without invoking handlers", async () => {
      const { pair, epA, epB, diagB } = createPairSetup(codecCase.createCodec(), {
        deliveryMode: "sync",
      });
      void epA;
      const handler = vi.fn(() => 99);
      epB.handle("add", handler);

      // Corrupt wire payload or invalid envelope version.
      pair.b.injectInbound(pair.a.localPeer, codecCase.createInvalidPayload());
      // Spoofed sender mismatching transport-authenticated peer.
      pair.b.injectInbound(
        pair.a.localPeer,
        codecCase.createCodec().encode({
          kind: "request",
          version: 1,
          requestId: "spoof-1",
          sender: { peerId: "mallory", instanceId: "inst-m" },
          target: pair.b.localPeer,
          method: "add",
          args: [1, 2],
        }),
      );

      expect(handler).not.toHaveBeenCalled();
      expect(diagB.filter((e) => e.type === "invalid-envelope")).toHaveLength(2);
    });
  });

  it("returns representable encode-failed error when handler return fails encoding", async () => {
    const codec = createJsonStringCodec();
    const { pair, epA, epB, diagA, diagB } = createPairSetup(codec, {
      deliveryMode: "sync",
    });
    epB.handle("echoValue", () => 123n);
    const client = epA.bindPeer(pair.b.localPeer);

    const caught = await client.call.echoValue(["ok"]).catch((err: unknown) => err);
    expect(caught).toBeInstanceOf(RpcError);
    expect((caught as RpcError).code).toBe("encode-failed");
    expect((caught as RpcError).code).not.toBe("remote-error");
    expect(diagB.some((e) => e.type === "late-send-failure" && e.operation === "response-encode")).toBe(
      true,
    );
    expect(diagA).toEqual([]);
  });

  it("matches responses strictly on requestId, peerId, and instanceId", async () => {
    const { pair, epA, epB, diagA } = createPairSetup(createIdentityCodec(), {
      deliveryMode: "manual",
    });
    epB.handle("add", (_ctx, a, b) => a + b);
    const client = epA.bindPeer(pair.b.localPeer);

    const pending = client.call.add([4, 5]);
    pair.a.flushNext();
    expect(pair.b.pendingDeliveryCount).toBe(1);

    const realResponse = pair.b.sentMessages[0]!.payload as Extract<RpcEnvelope, { kind: "response" }>;

    // Stale instanceId from the same peerId must be rejected as unmatched-response.
    const staleInstance: PeerAddress = {
      peerId: pair.b.localPeer.peerId,
      instanceId: "stale-instance",
    };
    pair.a.injectInbound(staleInstance, {
      ...realResponse,
      sender: staleInstance,
      result: 999,
    });

    // Different peerId with same requestId must also be rejected as unmatched-response.
    const wrongPeer: PeerAddress = {
      peerId: "peer-other",
      instanceId: pair.b.localPeer.instanceId,
    };
    pair.a.injectInbound(wrongPeer, {
      ...realResponse,
      sender: wrongPeer,
      result: 888,
    });

    expect(diagA.filter((e) => e.type === "unmatched-response")).toHaveLength(2);

    // Real peer instance response completes the pending wait normally.
    pair.b.flushAll();
    await expect(pending).resolves.toBe(9);
  });

  it("handles encode failure, already-aborted signal, timeout during send, cancel during admission, and late send rejection", async () => {
    const { scheduler, pair, epA, epB, idsA, diagA } = createPairSetup(createJsonStringCodec(), {
      deliveryMode: "manual",
    });

    let admissionSignalCount = 0;
    let resolveHandler!: (value: string) => void;
    epB.handle("delayedValue", (ctx) => {
      ctx.signal.addEventListener("abort", () => {
        admissionSignalCount += 1;
      });
      return new Promise<string>((resolve) => {
        resolveHandler = resolve;
      });
    });

    const client = epA.bindPeer(pair.b.localPeer);

    // 1. Outbound encode failure rejects cleanly with zero pending timers or sends.
    const idCountBefore = idsA.count;
    await expect(client.call.echoValue([42n])).rejects.toMatchObject({
      code: "encode-failed",
    });
    expect(pair.a.sentMessages).toHaveLength(0);
    // Sending same requestId later produces unmatched-response (entry deleted cleanly).
    const usedId = `reqA-${idCountBefore + 1}`;
    pair.a.injectInbound(pair.b.localPeer, JSON.stringify({
      kind: "response",
      version: 1,
      requestId: usedId,
      sender: pair.b.localPeer,
      target: pair.a.localPeer,
      ok: true,
      result: "late",
    }));
    expect(diagA.at(-1)).toMatchObject({ type: "unmatched-response", requestId: usedId });

    // 2. Pre-aborted CancelSignal performs zero ID generations, encodes, or sends.
    const preAborted = createTrackedCancelSource();
    preAborted.abort(new Error("already-aborted"));
    const countBeforePreAbort = idsA.count;
    await expect(
      client.call.add([1, 2], { signal: preAborted.signal }),
    ).rejects.toMatchObject({ code: "aborted" });
    expect(idsA.count).toBe(countBeforePreAbort);
    expect(pair.a.sentMessages).toHaveLength(0);

    // 3. Timeout while transport.send() is still pending (manual send settlement).
    pair.a.setSendSettlementMode("manual");
    const timedCancel = createTrackedCancelSource();
    const timedPromise = client.call.add([2, 3], {
      timeoutMs: 25,
      signal: timedCancel.signal,
    });
    expect(pair.a.pendingSendCount).toBe(1);
    expect(scheduler.pendingCount).toBe(1);

    scheduler.advanceBy(25);
    await expect(timedPromise).rejects.toMatchObject({ code: "timeout" });
    expect(scheduler.pendingCount).toBe(0);
    expect(timedCancel.activeListenerCount).toBe(0);

    // Late send rejection after settlement preserves caller's timeout outcome and emits diagnostic.
    expect(pair.a.rejectNextSend(new Error("late-transport-fail"))).toBe(true);
    await Promise.resolve();
    expect(diagA.at(-1)).toMatchObject({
      type: "late-send-failure",
      operation: "request-send",
      error: { code: "send-failed" },
    });
    pair.a.flushAll();
    pair.b.flushAll();

    // 4. Synchronous send throw fails with send-failed and no automatic retry.
    pair.a.setSendSettlementMode("immediate");
    pair.a.queueNextSendFault({ kind: "throw", error: new Error("sync-boom") });
    const countBeforeThrow = pair.a.sentMessages.length;
    await expect(client.call.add([5, 6])).rejects.toMatchObject({ code: "send-failed" });
    expect(pair.a.sentMessages).toHaveLength(countBeforeThrow);

    // 5. Cancellation during handler admission aborts ctx.signal cleanly.
    const sentBCountBeforeDelayed = pair.b.sentMessages.length;
    const cancelSource = createTrackedCancelSource();
    const callInProgress = client.call.delayedValue(["job-1"], {
      signal: cancelSource.signal,
    });
    expect(pair.a.flushNext()).toBe(true);
    cancelSource.abort(new Error("caller-cancelled"));
    await expect(callInProgress).rejects.toMatchObject({ code: "aborted" });
    expect(pair.a.flushAll()).toBe(1);
    expect(admissionSignalCount).toBe(1);
    // Non-cooperative handler settling later sends no extra response and throws nothing.
    resolveHandler("late-ignored-result");
    await Promise.resolve();
    expect(pair.b.sentMessages).toHaveLength(sentBCountBeforeDelayed);
    expect(cancelSource.activeListenerCount).toBe(0);
    expect(pair.a.pendingDeliveryCount).toBe(0);
    expect(pair.b.pendingDeliveryCount).toBe(0);
  });

  it("handles non-cooperative handlers, throwing diagnostics, and retired/unexpected peers without breaking cleanup", async () => {
    let throwDiagnostic = true;
    const { scheduler, pair, epA, epB } = createPairSetup(createIdentityCodec(), {
      deliveryMode: "manual",
      onDiagnosticA: () => {
        if (throwDiagnostic) {
          throw new Error("diagnostic-observer-failed");
        }
      },
      onDiagnosticB: () => {
        if (throwDiagnostic) {
          throw new Error("diagnostic-observer-failed");
        }
      },
    });

    epB.handle("delayedValue", () => new Promise<string>(() => undefined));
    const client = epA.bindPeer(pair.b.localPeer);

    // Trigger unmatched-response diagnostic which throws inside onDiagnosticA.
    pair.a.injectInbound(pair.b.localPeer, {
      kind: "response",
      version: 1,
      requestId: "unknown-id",
      sender: pair.b.localPeer,
      target: pair.a.localPeer,
      ok: true,
      result: "x",
    });

    // Trigger late-send-failure after timeout while onDiagnosticA throws.
    pair.a.setSendSettlementMode("manual");
    const call = client.call.delayedValue(["x"], { timeoutMs: 10 });
    scheduler.advanceBy(10);
    await expect(call).rejects.toMatchObject({ code: "timeout" });
    expect(pair.a.rejectNextSend(new Error("late-fail"))).toBe(true);
    await Promise.resolve();

    // Retiring peer fails in-flight calls and aborts inbound handlers immediately without remote ACK.
    pair.a.setSendSettlementMode("immediate");
    const pendingCall = client.call.delayedValue(["y"], { timeoutMs: 100 });
    pair.a.flushAll();
    expect(scheduler.pendingCount).toBe(1);

    let abortedOnRetire = false;
    epB.handle("add", (ctx) => {
      ctx.signal.addEventListener("abort", () => {
        abortedOnRetire = true;
      });
      return new Promise<number>(() => undefined);
    });

    epA.retirePeer(pair.b.localPeer);
    await expect(pendingCall).rejects.toMatchObject({ code: "disconnected" });
    expect(scheduler.pendingCount).toBe(0);

    // Late response arriving after peer retirement is ignored safely (even with throwing diagnostic).
    pair.a.injectInbound(pair.b.localPeer, {
      kind: "response",
      version: 1,
      requestId: "reqA-2",
      sender: pair.b.localPeer,
      target: pair.a.localPeer,
      ok: true,
      result: "too-late",
    });

    // Inbound request from A retired on B aborts handler immediately.
    const c2 = epA.bindPeer(pair.b.localPeer);
    const p2 = c2.call.add([1, 2]);
    pair.a.flushAll();
    expect(abortedOnRetire).toBe(false);
    epB.retirePeer(pair.a.localPeer);
    expect(abortedOnRetire).toBe(true);

    epA.close();
    epB.close();
    await expect(p2).rejects.toMatchObject({ code: "disconnected" });
    throwDiagnostic = false;
    expect(pair.a.listenerCount).toBe(0);
    expect(pair.b.listenerCount).toBe(0);
  });

  it("supports notifyMany preflight rejection, deduplication, and multi-target delivery", async () => {
    const codec = createJsonStringCodec();
    const sendManySpy = vi.fn(async (targets: readonly PeerAddress[]) =>
      targets.map((peer) => ({ peer, status: "sent" as const })),
    );
    const { pair, epA, epB } = createPairSetup(codec, { deliveryMode: "sync" });
    const p2: PeerAddress = { peerId: "peer-c", instanceId: "inst-c" };

    // Preflight encode failure rejects BEFORE any send.
    await expect(
      epA.notifyMany([pair.b.localPeer, p2], "echoValue" as never, [42n] as never),
    ).rejects.toMatchObject({ code: "encode-failed" });
    expect(pair.a.sentMessages).toHaveLength(0);

    // Preflight invalid method and pre-aborted signal reject before sending.
    const aborted = createTrackedCancelSource();
    aborted.abort();
    await expect(
      epA.notifyMany([pair.b.localPeer], "ping", [1], { signal: aborted.signal }),
    ).rejects.toMatchObject({ code: "aborted" });
    expect(pair.a.sentMessages).toHaveLength(0);

    // Empty targets returns [] without encoding/sending.
    await expect(epA.notifyMany([], "ping", [9])).resolves.toEqual([]);

    // Deduplicates identical PeerAddresses and delivers once per peer.
    const pings: number[] = [];
    epB.handle("ping", (_ctx, n) => {
      pings.push(n);
    });
    const outcomes = await epA.notifyMany(
      [pair.b.localPeer, { ...pair.b.localPeer }, p2],
      "ping",
      [11],
    );
    expect(outcomes).toEqual([
      { peer: pair.b.localPeer, status: "sent" },
      { peer: p2, status: "sent" },
    ]);
    expect(pings).toEqual([11]);

    // Transport without sendMany reports partial per-peer failures cleanly.
    pair.a.queueNextSendFault({ kind: "throw", error: new Error("first-peer-send-failed") });
    const partial = await epA.notifyMany([pair.b.localPeer, p2], "ping", [12]);
    expect(partial[0]).toMatchObject({
      peer: pair.b.localPeer,
      status: "failed",
      error: { code: "send-failed" },
    });
    expect(partial[1]).toEqual({ peer: p2, status: "sent" });

    // Transport implementing sendMany uses shared encoding path once.
    const transportWithMany = {
      ...pair.a,
      sendMany: sendManySpy,
    };
    const epMany = createRpcEndpoint({
      contract: coreContract,
      codec,
      transport: transportWithMany,
      localPeer: pair.a.localPeer,
    });
    cleanups.push(() => epMany.close());
    await epMany.notifyMany([pair.b.localPeer, p2], "ping", [22]);
    expect(sendManySpy).toHaveBeenCalledTimes(1);
    expect(sendManySpy.mock.calls[0]![0]).toEqual([pair.b.localPeer, p2]);
    epMany.close();
    await expect(epMany.notifyMany([pair.b.localPeer], "ping", [23])).rejects.toMatchObject({
      code: "disconnected",
    });
  });

  it("disposes single binding independently and honours owned vs borrowed transport disposal", async () => {
    const scheduler = createControllableScheduler();
    const pair = createPairedFakeTransport<RpcEnvelope, undefined, never, false>({
      scheduler,
      initialDeliveryMode: { kind: "manual" },
    });
    const peer1 = pair.b.localPeer;
    const peer2: PeerAddress = { peerId: "peer-b", instanceId: "inst-b2" };

    const epBorrowed = createRpcEndpoint({
      contract: coreContract,
      codec: createIdentityCodec(),
      transport: pair.a,
      localPeer: pair.a.localPeer,
      transportOwnership: "borrowed",
      scheduler,
    });
    const closeSpy = vi.spyOn(pair.a, "close");

    let inboundCalled = false;
    epBorrowed.handle("add", (_ctx, x, y) => {
      inboundCalled = true;
      return x + y;
    });

    const client1 = epBorrowed.bindPeer(peer1);
    const client2 = epBorrowed.bindPeer(peer2);

    const call1 = client1.call.add([1, 1], { timeoutMs: 50 });
    const call2 = client2.call.add([2, 2], { timeoutMs: 50 });

    // Disposing client1 rejects only client1; client2 and endpoint inbound handlers stay active.
    client1.dispose();
    await expect(call1).rejects.toMatchObject({ code: "disconnected" });
    await expect(client1.call.flush()).rejects.toMatchObject({ code: "disconnected" });
    expect(scheduler.pendingCount).toBe(1);

    // Inbound request continues working even after client1.dispose().
    pair.a.injectInbound(peer1, {
      kind: "request",
      version: 1,
      requestId: "inbound-1",
      sender: peer1,
      target: pair.a.localPeer,
      method: "add",
      args: [10, 20],
    });
    expect(inboundCalled).toBe(true);

    // client2 still resolves normally.
    pair.a.injectInbound(peer2, {
      kind: "response",
      version: 1,
      requestId: "rpc-2",
      sender: peer2,
      target: pair.a.localPeer,
      ok: true,
      result: 4,
    });
    await expect(call2).resolves.toBe(4);
    expect(scheduler.pendingCount).toBe(0);

    // Closing endpoint with borrowed transport detaches listener without closing transport.
    await epBorrowed.closeAsync();
    expect(pair.a.listenerCount).toBe(0);
    expect(closeSpy).not.toHaveBeenCalled();

    // Owned transport is closed once by close() / closeAsync().
    const epOwned = createRpcEndpoint({
      contract: coreContract,
      codec: createIdentityCodec(),
      transport: pair.b,
      localPeer: pair.b.localPeer,
      transportOwnership: "owned",
      scheduler,
    });
    const ownedCloseSpy = vi.spyOn(pair.b, "close");
    epOwned.close();
    await epOwned.closeAsync();
    expect(ownedCloseSpy).toHaveBeenCalledTimes(1);
    expect(pair.b.listenerCount).toBe(0);

    pair.dispose();
  });

  it("R1: rolls back pending-call setup when scheduler.setTimeout or signal.addEventListener throws", async () => {
    const scheduler = createControllableScheduler();
    const pair = createPairedFakeTransport<RpcEnvelope, undefined, never, false>({
      scheduler,
      initialDeliveryMode: { kind: "manual" },
    });
    const diagA: RpcDiagnosticEvent[] = [];
    const ids = createDeterministicIdSource("r1");

    let throwOnSchedule = true;
    const epA = createRpcEndpoint({
      contract: coreContract,
      codec: createIdentityCodec(),
      transport: pair.a,
      localPeer: pair.a.localPeer,
      scheduler: {
        setTimeout(cb, delayMs) {
          if (throwOnSchedule) {
            throw new Error("scheduler-boom");
          }
          return scheduler.setTimeout(cb, delayMs);
        },
      },
      generateId: ids.next,
      onDiagnostic: (event) => diagA.push(event),
    });
    cleanups.push(() => {
      epA.close();
      pair.dispose();
    });

    const client = epA.bindPeer(pair.b.localPeer);

    // 1. Throwing scheduler.setTimeout rejects without sending or retaining pending wait.
    await expect(client.call.add([1, 2], { timeoutMs: 50 })).rejects.toThrow("scheduler-boom");
    expect(pair.a.sentMessages).toHaveLength(0);
    pair.a.injectInbound(pair.b.localPeer, {
      kind: "response",
      version: 1,
      requestId: "r1-1",
      sender: pair.b.localPeer,
      target: pair.a.localPeer,
      ok: true,
      result: 3,
    });
    expect(diagA.filter((e) => e.type === "unmatched-response")).toHaveLength(1);

    // 2. Throwing signal.addEventListener cleans up already allocated deadline timer.
    throwOnSchedule = false;
    const badSignal = {
      aborted: false,
      reason: undefined,
      addEventListener() {
        throw new Error("signal-subscribe-boom");
      },
      removeEventListener() {
        // no-op
      },
    };
    await expect(
      client.call.add([3, 4], { timeoutMs: 50, signal: badSignal }),
    ).rejects.toThrow("signal-subscribe-boom");
    expect(pair.a.sentMessages).toHaveLength(0);
    expect(scheduler.pendingCount).toBe(0);
    pair.a.injectInbound(pair.b.localPeer, {
      kind: "response",
      version: 1,
      requestId: "r1-2",
      sender: pair.b.localPeer,
      target: pair.a.localPeer,
      ok: true,
      result: 7,
    });
    expect(diagA.filter((e) => e.type === "unmatched-response")).toHaveLength(2);
  });

  it("R2: tracks notification execution through peer retirement and endpoint shutdown without sending responses", async () => {
    const scheduler = createControllableScheduler();
    const pair = createPairedFakeTransport<RpcEnvelope, undefined, never, false>({
      scheduler,
      initialDeliveryMode: { kind: "sync" },
    });
    const epB = createRpcEndpoint({
      contract: coreContract,
      codec: createIdentityCodec(),
      transport: pair.b,
      localPeer: pair.b.localPeer,
      scheduler,
    });
    cleanups.push(() => {
      epB.close();
      pair.dispose();
    });

    const peerC: PeerAddress = { peerId: "peer-c", instanceId: "inst-c-1" };
    const signalsBySeq = new Map<number, boolean[]>();
    const resolversBySeq = new Map<number, () => void>();
    epB.handle("ping", (ctx, seq) => {
      const states: boolean[] = [ctx.signal.aborted];
      ctx.signal.addEventListener("abort", () => {
        states.push(ctx.signal.aborted);
      });
      signalsBySeq.set(seq, states);
      return new Promise<void>((resolve) => {
        resolversBySeq.set(seq, resolve);
      });
    });

    // Inject notifications from peerA and peerC.
    pair.b.injectInbound(pair.a.localPeer, {
      kind: "notify",
      version: 1,
      sender: pair.a.localPeer,
      target: pair.b.localPeer,
      method: "ping",
      args: [1],
    });
    pair.b.injectInbound(peerC, {
      kind: "notify",
      version: 1,
      sender: peerC,
      target: pair.b.localPeer,
      method: "ping",
      args: [2],
    });

    // Retiring peerA aborts seq 1 but leaves peerC's seq 2 active.
    epB.retirePeer(pair.a.localPeer);
    expect(signalsBySeq.get(1)).toEqual([false, true]);
    expect(signalsBySeq.get(2)).toEqual([false]);

    // Closing endpoint aborts remaining active notification (seq 2) with zero response frames.
    epB.close();
    expect(signalsBySeq.get(2)).toEqual([false, true]);
    resolversBySeq.get(1)?.();
    resolversBySeq.get(2)?.();
    await Promise.resolve();
    expect(pair.b.sentMessages).toHaveLength(0);
  });

  it("R3: preserves cancellation ownership across duplicate request deliveries and isolates peer instances", async () => {
    const scheduler = createControllableScheduler();
    const pair = createPairedFakeTransport<RpcEnvelope, undefined, never, false>({
      scheduler,
      initialDeliveryMode: { kind: "sync" },
    });
    const epB = createRpcEndpoint({
      contract: coreContract,
      codec: createIdentityCodec(),
      transport: pair.b,
      localPeer: pair.b.localPeer,
      scheduler,
    });
    cleanups.push(() => {
      epB.close();
      pair.dispose();
    });

    const capturedSignals: Array<{ readonly tag: string; readonly signal: { readonly aborted: boolean } }> = [];
    const resolvers = new Map<string, (val: string) => void>();
    epB.handle("delayedValue", (ctx, tag) => {
      capturedSignals.push({ tag, signal: ctx.signal });
      return new Promise<string>((resolve) => {
        resolvers.set(tag, resolve);
      });
    });

    // 1. Two concurrent duplicate deliveries with same requestId from peerA.
    pair.b.injectInbound(pair.a.localPeer, {
      kind: "request",
      version: 1,
      requestId: "dup-1",
      sender: pair.a.localPeer,
      target: pair.b.localPeer,
      method: "delayedValue",
      args: ["first"],
    });
    pair.b.injectInbound(pair.a.localPeer, {
      kind: "request",
      version: 1,
      requestId: "dup-1",
      sender: pair.a.localPeer,
      target: pair.b.localPeer,
      method: "delayedValue",
      args: ["second"],
    });

    // Different peer instance with identical requestId must remain isolated.
    const otherInstance: PeerAddress = {
      peerId: pair.a.localPeer.peerId,
      instanceId: "inst-a-2",
    };
    pair.b.injectInbound(otherInstance, {
      kind: "request",
      version: 1,
      requestId: "dup-1",
      sender: otherInstance,
      target: pair.b.localPeer,
      method: "delayedValue",
      args: ["other-instance"],
    });

    // Cancel for peerA aborts both duplicate deliveries and leaves otherInstance untouched.
    pair.b.injectInbound(pair.a.localPeer, {
      kind: "cancel",
      version: 1,
      requestId: "dup-1",
      sender: pair.a.localPeer,
      target: pair.b.localPeer,
    });
    expect(capturedSignals.map((s) => s.signal.aborted)).toEqual([true, true, false]);

    // Resolving cancelled duplicates emits zero responses.
    resolvers.get("first")?.("late-1");
    resolvers.get("second")?.("late-2");
    await Promise.resolve();
    expect(pair.b.sentMessages).toHaveLength(0);

    // Completing older duplicate first leaves newer duplicate cancellable.
    pair.b.injectInbound(pair.a.localPeer, {
      kind: "request",
      version: 1,
      requestId: "dup-2",
      sender: pair.a.localPeer,
      target: pair.b.localPeer,
      method: "delayedValue",
      args: ["older"],
    });
    pair.b.injectInbound(pair.a.localPeer, {
      kind: "request",
      version: 1,
      requestId: "dup-2",
      sender: pair.a.localPeer,
      target: pair.b.localPeer,
      method: "delayedValue",
      args: ["newer"],
    });
    resolvers.get("older")?.("done-older");
    await Promise.resolve();
    pair.b.injectInbound(pair.a.localPeer, {
      kind: "cancel",
      version: 1,
      requestId: "dup-2",
      sender: pair.a.localPeer,
      target: pair.b.localPeer,
    });
    const newerEntry = capturedSignals.find((s) => s.tag === "newer")!;
    expect(newerEntry.signal.aborted).toBe(true);

    // Remaining other-instance operation aborts on endpoint close.
    epB.close();
    expect(capturedSignals.find((s) => s.tag === "other-instance")!.signal.aborted).toBe(true);
  });

  it("snapshots host PeerAddress once with invalid-contract checks while keeping remote envelope validation as invalid-envelope", async () => {
    const codec = createJsonStringCodec();
    const { pair, epA, epB } = createPairSetup(codec, { deliveryMode: "sync" });
    epA.close();
    const diagnostics: RpcDiagnosticEvent[] = [];

    // Invalid PeerAddress fails immediately at host-facing boundaries with invalid-contract.
    expect(() =>
      createRpcEndpoint({
        contract: coreContract,
        codec,
        transport: pair.a,
        localPeer: { peerId: "", instanceId: "i" },
      }),
    ).toThrowError(expect.objectContaining({ code: "invalid-contract" }));

    let localPeerIdReads = 0;
    let localInstReads = 0;
    let mutableLocalPeerId = pair.a.localPeer.peerId;
    let mutableLocalInst = pair.a.localPeer.instanceId;
    const localInput = {
      extra: "ignored",
      get peerId() {
        localPeerIdReads += 1;
        return mutableLocalPeerId;
      },
      get instanceId() {
        localInstReads += 1;
        return mutableLocalInst;
      },
    };

    const epSnap = createRpcEndpoint({
      contract: coreContract,
      codec,
      transport: pair.a,
      localPeer: localInput,
      onDiagnostic: (ev) => diagnostics.push(ev),
    });
    cleanups.push(() => epSnap.close());

    expect(localPeerIdReads).toBe(1);
    expect(localInstReads).toBe(1);

    let remotePeerIdReads = 0;
    let remoteInstReads = 0;
    let mutableRemotePeerId = pair.b.localPeer.peerId;
    let mutableRemoteInst = pair.b.localPeer.instanceId;
    const remoteInput = {
      extraFlag: true,
      get peerId() {
        remotePeerIdReads += 1;
        return mutableRemotePeerId;
      },
      get instanceId() {
        remoteInstReads += 1;
        return mutableRemoteInst;
      },
    };

    expect(() => epSnap.bindPeer({ peerId: "ok", instanceId: "" })).toThrowError(
      expect.objectContaining({ code: "invalid-contract" }),
    );
    expect(() => epSnap.retirePeer(null as never)).toThrowError(
      expect.objectContaining({ code: "invalid-contract" }),
    );
    await expect(
      epSnap.notifyMany([{ peerId: "x", instanceId: 123 as never }], "ping", [1]),
    ).rejects.toMatchObject({ code: "invalid-contract" });

    const client = epSnap.bindPeer(remoteInput);
    expect(remotePeerIdReads).toBe(1);
    expect(remoteInstReads).toBe(1);
    expect(client.peer).toEqual({
      peerId: pair.b.localPeer.peerId,
      instanceId: pair.b.localPeer.instanceId,
    });
    expect(client.peer === remoteInput).toBe(false);
    expect("extraFlag" in client.peer).toBe(false);

    // Mutate caller-owned objects after acceptance; retained snapshot must remain unchanged.
    mutableLocalPeerId = "mutated-local";
    mutableLocalInst = "mutated-local-inst";
    mutableRemotePeerId = "mutated-remote";
    mutableRemoteInst = "mutated-remote-inst";

    epB.handle("add", (_ctx, a, b) => a + b);
    await expect(client.call.add([2, 3])).resolves.toBe(5);
    expect(localPeerIdReads).toBe(1);
    expect(localInstReads).toBe(1);
    expect(remotePeerIdReads).toBe(1);
    expect(remoteInstReads).toBe(1);

    const notifyTarget = { ...pair.b.localPeer, ignoredProp: 99 };
    const outcomes = await epSnap.notifyMany([notifyTarget], "ping", [7]);
    expect(outcomes).toEqual([{ peer: pair.b.localPeer, status: "sent" }]);
    expect(outcomes[0]!.peer === notifyTarget).toBe(false);
    expect("ignoredProp" in outcomes[0]!.peer).toBe(false);

    // Retire peer using an input object with extra properties while a call is still pending.
    epB.handle("delayedValue", () => new Promise<string>(() => undefined));
    const pendingCall = client.call.delayedValue(["wait-for-retire"]);
    const retireInput = { ...pair.b.localPeer, extra: "drop" };
    epSnap.retirePeer(retireInput);
    await expect(pendingCall).rejects.toMatchObject({ code: "disconnected" });

    // Malformed inbound wire envelope remains invalid-envelope diagnostic (never invalid-contract).
    pair.a.injectInbound(pair.b.localPeer, {
      kind: "notify",
      version: 1,
      sender: { peerId: "", instanceId: "bad" },
      method: "ping",
      args: [1],
    });
    expect(diagnostics.some((d) => d.type === "invalid-envelope")).toBe(true);
  });
});
