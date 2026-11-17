import { afterEach, describe, expect, it } from "vitest";
import {
  RpcError,
  call,
  createRpcEndpoint,
  defineContract,
  type PeerAddress,
  type RpcDiagnosticEvent,
  type RpcEnvelope,
  type RpcTransport,
} from "../src/index.js";
import { createControllableScheduler } from "./facilities/controllableScheduler.js";
import { createDeterministicIdSource } from "./facilities/deterministicIds.js";
import { createPairedFakeTransport } from "./facilities/pairedFakeTransport.js";
import { createIdentityCodec, createTrackedCancelSource } from "./testHelpers.js";

const framingContract = defineContract({
  work: call<[jobId: string], string>(),
  upload: call<[payload: Uint8Array], void>().transfer({ input: "required" }),
});

describe("Profile capability checks and request-before-cancel framing order", () => {
  const cleanups: Array<() => void | Promise<void>> = [];

  afterEach(async () => {
    while (cleanups.length > 0) {
      const cleanup = cleanups.pop()!;
      await cleanup();
    }
  });

  it("rejects profiles lacking request-before-cancel guarantees or required capabilities", () => {
    const scheduler = createControllableScheduler();
    const pair = createPairedFakeTransport<RpcEnvelope, undefined, never, false>({
      scheduler,
    });
    cleanups.push(() => pair.dispose());

    const noOrderTransport: RpcTransport<RpcEnvelope, undefined, never, false> = {
      ...pair.a,
      capabilities: {
        ...pair.a.capabilities,
        guaranteesRequestBeforeCancel: false,
      },
    };

    const copyContract = defineContract({
      ping: call<[], void>(),
    });

    expect(() =>
      createRpcEndpoint({
        contract: copyContract,
        codec: createIdentityCodec(),
        transport: noOrderTransport,
        localPeer: pair.a.localPeer,
        scheduler,
      }),
    ).toThrowError(RpcError);

    try {
      createRpcEndpoint({
        contract: framingContract as never,
        codec: createIdentityCodec(),
        transport: pair.a,
        localPeer: pair.a.localPeer,
        scheduler,
      });
      expect.unreachable("Expected transfer capability rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(RpcError);
      expect((error as RpcError).code).toBe("unsupported-profile");
    }
  });

  it("defers cancel dispatch until delayed request framing ACK resolves so receiver creates context first", async () => {
    const peerA: PeerAddress = { peerId: "peer-a", instanceId: "inst-a" };
    const peerB: PeerAddress = { peerId: "peer-b", instanceId: "inst-b" };
    const listenersB = new Set<(from: PeerAddress, payload: RpcEnvelope) => void>();
    const listenersA = new Set<(from: PeerAddress, payload: RpcEnvelope) => void>();

    interface QueuedFrame {
      readonly envelope: RpcEnvelope;
      readonly ackResolve: () => void;
    }

    const outboundAFrames: QueuedFrame[] = [];
    const dispatchLog: string[] = [];

    const framingTransportA: RpcTransport<RpcEnvelope, undefined, never, false> = {
      capabilities: {
        supportsTransfer: false,
        guaranteesRequestBeforeCancel: true,
        supportsOrderedStreams: true,
      },
      send(_target, envelope) {
        return new Promise<void>((resolve) => {
          outboundAFrames.push({
            envelope,
            ackResolve: () => resolve(),
          });
        });
      },
      subscribe(handler) {
        listenersA.add(handler);
        return () => listenersA.delete(handler);
      },
    };

    const framingTransportB: RpcTransport<RpcEnvelope, undefined, never, false> = {
      capabilities: framingTransportA.capabilities,
      send(_target, envelope) {
        for (const handler of listenersA) {
          handler(peerB, envelope);
        }
      },
      subscribe(handler) {
        listenersB.add(handler);
        return () => listenersB.delete(handler);
      },
    };

    const contract = defineContract({ work: call<[jobId: string], string>() });
    const ids = createDeterministicIdSource("frame");
    const epA = createRpcEndpoint({
      contract,
      codec: createIdentityCodec(),
      transport: framingTransportA,
      localPeer: peerA,
      generateId: ids.next,
    });
    const epB = createRpcEndpoint({
      contract,
      codec: createIdentityCodec(),
      transport: framingTransportB,
      localPeer: peerB,
    });
    cleanups.push(() => {
      epA.close();
      epB.close();
    });

    let resolveHandler!: (value: string) => void;
    epB.handle("work", (ctx, jobId) => {
      dispatchLog.push(`context-created:${jobId}`);
      ctx.signal.addEventListener(
        "abort",
        () => {
          dispatchLog.push(`signal-aborted:${jobId}`);
        },
        { once: true },
      );
      return new Promise<string>((resolve) => {
        resolveHandler = resolve;
      });
    });

    const clientA = epA.bindPeer(peerB);
    const cancelSource = createTrackedCancelSource();
    const callPromise = clientA.call.work(["job-alpha"], { signal: cancelSource.signal });

    // 1. Request frame queued with delayed framing ACK; receiver has NOT seen it yet.
    expect(outboundAFrames).toHaveLength(1);
    expect(outboundAFrames[0]!.envelope.kind).toBe("request");
    expect(dispatchLog).toEqual([]);

    // 2. Caller aborts locally BEFORE framing ACK completes.
    cancelSource.abort(new Error("user-cancelled"));
    await expect(callPromise).rejects.toMatchObject({ code: "aborted" });
    await Promise.resolve();

    // Cancel MUST NOT be queued onto transport before request send ACK settles!
    expect(outboundAFrames).toHaveLength(1);
    expect(cancelSource.activeListenerCount).toBe(0);

    // 3. Deliver request frame to receiver (creating invocation context) and settle request ACK.
    const requestFrame = outboundAFrames.shift()!;
    for (const handler of listenersB) {
      handler(peerA, requestFrame.envelope);
    }
    requestFrame.ackResolve();
    await Promise.resolve();
    await Promise.resolve();

    // Now cancel frame has been dispatched AFTER request context creation.
    expect(outboundAFrames).toHaveLength(1);
    expect(outboundAFrames[0]!.envelope.kind).toBe("cancel");
    const cancelFrame = outboundAFrames.shift()!;
    for (const handler of listenersB) {
      handler(peerA, cancelFrame.envelope);
    }
    cancelFrame.ackResolve();

    expect(dispatchLog).toEqual(["context-created:job-alpha", "signal-aborted:job-alpha"]);

    // Settling handler after cancellation produces no late response.
    resolveHandler("ignored");
    await Promise.resolve();
  });

  it("handles a response already in flight when local cancel occurs without dangling state", async () => {
    const scheduler = createControllableScheduler();
    const pair = createPairedFakeTransport<RpcEnvelope, undefined, never, false>({
      scheduler,
      initialDeliveryMode: { kind: "manual" },
    });
    const diagA: RpcDiagnosticEvent[] = [];
    const contract = defineContract({ work: call<[jobId: string], string>() });

    const epA = createRpcEndpoint({
      contract,
      codec: createIdentityCodec(),
      transport: pair.a,
      localPeer: pair.a.localPeer,
      scheduler,
      onDiagnostic: (event) => diagA.push(event),
    });
    const epB = createRpcEndpoint({
      contract,
      codec: createIdentityCodec(),
      transport: pair.b,
      localPeer: pair.b.localPeer,
      scheduler,
    });
    cleanups.push(() => {
      epA.close();
      epB.close();
      pair.dispose();
    });

    epB.handle("work", (_ctx, jobId) => `done:${jobId}`);
    const clientA = epA.bindPeer(pair.b.localPeer);
    const cancelSource = createTrackedCancelSource();
    const pending = clientA.call.work(["job-race"], {
      timeoutMs: 100,
      signal: cancelSource.signal,
    });

    // Deliver request to B and let B queue its response (response is now in flight).
    expect(pair.a.flushNext()).toBe(true);
    expect(pair.b.pendingDeliveryCount).toBe(1);

    // Caller cancels while B's response is still in flight on the wire.
    cancelSource.abort(new Error("aborted-before-response-arrived"));
    await expect(pending).rejects.toMatchObject({ code: "aborted" });
    await Promise.resolve();

    // Deliver the in-flight response to A (must be unmatched-response, no timer/listener leak)
    // and deliver A's cancel frame to B (ignored because B already finished).
    expect(pair.b.flushNext()).toBe(true);
    expect(pair.a.flushNext()).toBe(true);

    expect(diagA).toHaveLength(1);
    expect(diagA[0]).toMatchObject({ type: "unmatched-response", peer: pair.b.localPeer });
    expect(scheduler.pendingCount).toBe(0);
    expect(cancelSource.activeListenerCount).toBe(0);
    expect(pair.a.pendingDeliveryCount).toBe(0);
    expect(pair.b.pendingDeliveryCount).toBe(0);
  });
});
