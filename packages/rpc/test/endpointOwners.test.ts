import { describe, expect, it, vi } from "vitest";
import { RpcError, call, notify, withTransfer } from "../src/index.js";
import {
  isValidEnvelope,
  peerAddressKey,
  prepareOutboundArgs,
  prepareOutboundResult,
} from "../src/endpoint/envelopes.js";
import { createInboundOperationRegistry } from "../src/endpoint/inboundOperations.js";
import { createPendingCallRegistry } from "../src/endpoint/pendingCalls.js";
import { createEndpointSender } from "../src/endpoint/sending.js";
import type {
  PeerAddress,
  RpcDiagnosticEvent,
  RpcEnvelope,
  RpcInvocationContext,
} from "../src/types.js";
import { createDeterministicIdSource } from "./facilities/deterministicIds.js";
import { createIdentityCodec } from "./testHelpers.js";

const localPeer: PeerAddress = { peerId: "local", instanceId: "inst-l" };
const remotePeer: PeerAddress = { peerId: "remote", instanceId: "inst-r" };
const otherPeer: PeerAddress = { peerId: "other", instanceId: "inst-o" };

describe("Focused endpoint owners", () => {
  it("validates envelopes, peer keys, and transfer wrappers purely in envelopes.ts", () => {
    expect(peerAddressKey({ peerId: "a\x00b", instanceId: "1" })).not.toBe(
      peerAddressKey({ peerId: "a", instanceId: "b\x001" }),
    );

    expect(
      isValidEnvelope(
        {
          kind: "request",
          version: 1,
          requestId: "r-1",
          sender: remotePeer,
          target: localPeer,
          method: "add",
          args: [1, 2],
        },
        remotePeer,
        localPeer,
      ),
    ).toBe(true);

    // Mismatched instanceId on sender must fail validation.
    expect(
      isValidEnvelope(
        {
          kind: "notify",
          version: 1,
          sender: { peerId: remotePeer.peerId, instanceId: "other" },
          method: "ping",
          args: [],
        },
        remotePeer,
        localPeer,
      ),
    ).toBe(false);

    const bytes = new Uint8Array([1, 2]);
    expect(() =>
      prepareOutboundArgs([withTransfer(bytes, [bytes.buffer])], "none", true, remotePeer),
    ).toThrowError(RpcError);
    expect(() =>
      prepareOutboundResult(bytes, "required", true, remotePeer),
    ).toThrowError(RpcError);
  });

  it("handles encode fallback and late send diagnostics without retries in sending.ts", async () => {
    const diagnostics: RpcDiagnosticEvent[] = [];
    const sentPayloads: RpcEnvelope[] = [];
    let failNextSend: unknown = undefined;

    const sender = createEndpointSender({
      codec: {
        encode(envelope) {
          if (envelope.kind === "response" && envelope.ok && envelope.result === "bad") {
            throw new TypeError("unencodable-result");
          }
          return envelope;
        },
      },
      transport: {
        capabilities: {
          supportsTransfer: false,
          guaranteesRequestBeforeCancel: true,
        },
        send(_target, payload) {
          if (failNextSend !== undefined) {
            const err = failNextSend;
            failNextSend = undefined;
            return Promise.reject(err);
          }
          sentPayloads.push(payload);
        },
      },
      localPeer,
      emitDiagnostic: (event) => diagnostics.push(event),
    });

    const descriptor = call<[x: string], string>();
    sender.sendSuccessResponse(remotePeer, "req-1", descriptor, "bad");
    expect(sentPayloads).toHaveLength(1);
    expect(sentPayloads[0]).toMatchObject({
      kind: "response",
      requestId: "req-1",
      ok: false,
      error: { code: "encode-failed" },
    });
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      type: "late-send-failure",
      operation: "response-encode",
    });

    failNextSend = new Error("async-drop");
    sender.sendErrorResponse(remotePeer, "req-2", new Error("boom"));
    await Promise.resolve();
    expect(diagnostics.at(-1)).toMatchObject({
      type: "late-send-failure",
      operation: "response-error",
      error: { code: "send-failed" },
    });
    expect(sentPayloads).toHaveLength(1);

    // R2: Asynchronous transfer-failed send rejection sends a representable error response
    // cleanly without retrying the original transferred payload or recursing on fallback failure.
    failNextSend = new RpcError("transfer-failed", "async-transfer-reject");
    sender.sendSuccessResponse(remotePeer, "req-3", descriptor, "ok-value");
    await Promise.resolve();
    await Promise.resolve();
    expect(sentPayloads).toHaveLength(2);
    expect(sentPayloads[1]).toMatchObject({
      kind: "response",
      requestId: "req-3",
      ok: false,
      error: { code: "transfer-failed", message: "async-transfer-reject" },
    });

    // If the error fallback itself also rejects, it emits diagnostics without recursion.
    let sendCount = 0;
    const alwaysRejectSender = createEndpointSender({
      codec: createIdentityCodec(),
      transport: {
        capabilities: {
          supportsTransfer: false,
          guaranteesRequestBeforeCancel: true,
        },
        send() {
          sendCount += 1;
          return Promise.reject(new RpcError("transfer-failed", "always-fail"));
        },
      },
      localPeer,
      emitDiagnostic: (event) => diagnostics.push(event),
    });
    alwaysRejectSender.sendSuccessResponse(remotePeer, "req-4", descriptor, "ok-value");
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(sendCount).toBe(2);
  });

  it("completes settlement even when timer or abort cleanup throws in pendingCalls.ts", async () => {
    const diagnostics: RpcDiagnosticEvent[] = [];
    const ids = createDeterministicIdSource("pc");
    const sent: RpcEnvelope[] = [];
    const codec = createIdentityCodec();

    const registry = createPendingCallRegistry({
      localPeer,
      codec,
      transport: {
        capabilities: {
          supportsTransfer: false,
          guaranteesRequestBeforeCancel: true,
        },
        send(_target, payload) {
          sent.push(payload);
        },
      },
      scheduler: {
        setTimeout() {
          return () => {
            throw new Error("timer-cleanup-boom");
          };
        },
      },
      generateId: ids.next,
      sender: {
        dispatchBestEffort: async () => undefined,
      },
      emitDiagnostic: (e) => diagnostics.push(e),
      isEndpointClosed: () => false,
    });

    const badRemoveSignal = {
      aborted: false,
      reason: undefined,
      addEventListener() {
        // registered
      },
      removeEventListener() {
        throw new Error("abort-cleanup-boom");
      },
    };

    const descriptor = call<[], string>();
    const callPromise = registry.invokeCall(
      remotePeer,
      Symbol("b"),
      () => false,
      "echo",
      descriptor,
      [],
      { timeoutMs: 100, signal: badRemoveSignal },
    );

    registry.handleResponse(remotePeer, {
      kind: "response",
      version: 1,
      requestId: "pc-1",
      sender: remotePeer,
      target: localPeer,
      ok: true,
      result: "ok",
    });

    await expect(callPromise).resolves.toBe("ok");
  });

  it("tracks inbound request and notification lifetimes cleanly in inboundOperations.ts", async () => {
    const diagnostics: RpcDiagnosticEvent[] = [];
    const sendSuccessResponse = vi.fn();
    const sendErrorResponse = vi.fn();

    const callDesc = call<[tag: string], string>();
    const notifyDesc = notify<[tag: string]>();

    const contexts = new Map<string, RpcInvocationContext>();
    const resolvers = new Map<string, (value?: string) => void>();
    const rejectors = new Map<string, (reason: unknown) => void>();

    const inbound = createInboundOperationRegistry({
      getDescriptor: (method) => (method === "work" ? callDesc : notifyDesc),
      getHandler: (method) => {
        if (method === "work") {
          return (ctx: RpcInvocationContext, tag: unknown) => {
            const key = String(tag);
            contexts.set(key, ctx);
            return new Promise<string>((resolve, reject) => {
              resolvers.set(key, (val) => resolve(val ?? `ok:${key}`));
              rejectors.set(key, reject);
            });
          };
        }
        return (ctx: RpcInvocationContext, tag: unknown) => {
          const key = String(tag);
          contexts.set(key, ctx);
          return new Promise<void>((resolve, reject) => {
            resolvers.set(key, () => resolve());
            rejectors.set(key, reject);
          });
        };
      },
      sender: { sendSuccessResponse, sendErrorResponse },
      emitDiagnostic: (e) => diagnostics.push(e),
      isEndpointClosed: () => false,
    });

    // 1. Notifications: completed, rejected, peer-retired active, and endpoint-closed active.
    inbound.handleNotify(remotePeer, {
      kind: "notify",
      version: 1,
      sender: remotePeer,
      target: localPeer,
      method: "ping",
      args: ["n-complete"],
    });
    inbound.handleNotify(remotePeer, {
      kind: "notify",
      version: 1,
      sender: remotePeer,
      target: localPeer,
      method: "ping",
      args: ["n-reject"],
    });
    inbound.handleNotify(remotePeer, {
      kind: "notify",
      version: 1,
      sender: remotePeer,
      target: localPeer,
      method: "ping",
      args: ["n-active-remote"],
    });
    inbound.handleNotify(otherPeer, {
      kind: "notify",
      version: 1,
      sender: otherPeer,
      target: localPeer,
      method: "ping",
      args: ["n-active-other"],
    });

    // 2. Requests: one completed and one still active.
    inbound.handleRequest(remotePeer, {
      kind: "request",
      version: 1,
      requestId: "r-done",
      sender: remotePeer,
      target: localPeer,
      method: "work",
      args: ["req-complete"],
    });
    inbound.handleRequest(otherPeer, {
      kind: "request",
      version: 1,
      requestId: "r-active",
      sender: otherPeer,
      target: localPeer,
      method: "work",
      args: ["req-active"],
    });

    // Complete/reject the settled operations before retiring/closing.
    resolvers.get("n-complete")!();
    rejectors.get("n-reject")!(new Error("notify-boom"));
    resolvers.get("req-complete")!("done-value");
    await Promise.resolve();
    await Promise.resolve();

    expect(sendSuccessResponse).toHaveBeenCalledTimes(1);
    expect(sendSuccessResponse).toHaveBeenCalledWith(remotePeer, "r-done", callDesc, "done-value");
    expect(sendErrorResponse).not.toHaveBeenCalled();
    expect(diagnostics.filter((e) => e.type === "handler-error")).toHaveLength(1);

    // Retiring remotePeer aborts only active operations from remotePeer, not completed ones or otherPeer.
    inbound.retirePeer(peerAddressKey(remotePeer), new RpcError("disconnected", "retired"));
    expect(contexts.get("n-complete")!.signal.aborted).toBe(false);
    expect(contexts.get("n-reject")!.signal.aborted).toBe(false);
    expect(contexts.get("req-complete")!.signal.aborted).toBe(false);
    expect(contexts.get("n-active-remote")!.signal.aborted).toBe(true);
    expect(contexts.get("n-active-other")!.signal.aborted).toBe(false);
    expect(contexts.get("req-active")!.signal.aborted).toBe(false);

    // Closing the owner aborts remaining active operations and ignores later completion.
    inbound.closeAll(new RpcError("disconnected", "closed"));
    expect(contexts.get("n-active-other")!.signal.aborted).toBe(true);
    expect(contexts.get("req-active")!.signal.aborted).toBe(true);
    expect(contexts.get("n-complete")!.signal.aborted).toBe(false);
    expect(contexts.get("n-reject")!.signal.aborted).toBe(false);
    expect(contexts.get("req-complete")!.signal.aborted).toBe(false);

    // Late resolution of closed/aborted request emits no extra response.
    resolvers.get("req-active")!("late-value");
    await Promise.resolve();
    expect(sendSuccessResponse).toHaveBeenCalledTimes(1);
    expect(sendErrorResponse).not.toHaveBeenCalled();
  });
});
