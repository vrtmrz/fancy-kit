import { describe, expect, it, vi } from "vitest";
import { RpcError } from "../src/p2p/RpcError.js";
import { createInboundCalls } from "../src/p2p/inboundCalls.js";
import type { RpcEnvelope, RpcRequestEnvelope } from "../src/p2p/types.js";

function createResponder(
  sendEnvelope: (peerId: string, envelope: RpcEnvelope) => Promise<void>,
  onWarning?: (message: string, peerId: string) => void,
) {
  const warnings: Array<{ message: string; peerId: string }> = [];
  const responder = createInboundCalls<AbortSignal>({
    createAbortController: () => new AbortController(),
    canAcceptRequest: undefined,
    sendEnvelope,
    warn: (message, peerId) => {
      warnings.push({ message, peerId });
      onWarning?.(message, peerId);
    },
  });
  return { responder, warnings };
}

const request: RpcRequestEnvelope = {
  kind: "request",
  requestId: "request-17",
  method: "records.save",
  args: [],
};

describe("P2P response sending", () => {
  it("reports successful handler execution when its response send fails", async () => {
    const sendFailure = new RpcError("NOT_CONNECTED", "transport offline", {
      stage: "success-response",
    });
    const sent: Array<{ peerId: string; envelope: RpcEnvelope }> = [];
    const sendEnvelope = vi.fn(async (peerId: string, envelope: RpcEnvelope) => {
      if (envelope.kind === "response" && envelope.ok) {
        throw sendFailure;
      }
      sent.push({ peerId, envelope });
    });
    const { responder, warnings } = createResponder(sendEnvelope);
    let handlerCalls = 0;
    responder.register("records.save", {
      invoke: () => {
        handlerCalls += 1;
        return "saved";
      },
      serial: false,
      queue: Promise.resolve(),
    });

    await responder.receiveRequest(request, "peer-7");

    expect(handlerCalls).toBe(1);
    expect(sendEnvelope).toHaveBeenCalledTimes(2);
    expect(sent).toEqual([
      {
        peerId: "peer-7",
        envelope: {
          kind: "response",
          requestId: "request-17",
          ok: false,
          error: {
            code: "NOT_CONNECTED",
            message:
              "RPC method records.save completed successfully, but sending its " +
              "success response failed: transport offline",
            details: { stage: "success-response" },
          },
        },
      },
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toEqual({
      message: expect.stringContaining("records.save"),
      peerId: "peer-7",
    });
    expect(warnings[0]?.message).toContain("request-17");
    expect(warnings[0]?.message).toContain("completed successfully");
    expect(warnings[0]?.message).toContain(
      "sending its success response failed",
    );
  });

  it("does not retry or reclassify a failed fallback error response send", async () => {
    const sendFailure = new Error("transport offline");
    const sendEnvelope = vi.fn(async () => {
      throw sendFailure;
    });
    const { responder, warnings } = createResponder(sendEnvelope);
    let handlerCalls = 0;
    responder.register("records.save", {
      invoke: () => {
        handlerCalls += 1;
        return "saved";
      },
      serial: false,
      queue: Promise.resolve(),
    });

    await expect(
      responder.receiveRequest(request, "peer-7"),
    ).resolves.toBeUndefined();

    expect(handlerCalls).toBe(1);
    expect(sendEnvelope).toHaveBeenCalledTimes(2);
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toMatchObject({
      peerId: "peer-7",
      message: expect.stringContaining("completed successfully"),
    });
    expect(warnings[1]).toMatchObject({
      peerId: "peer-7",
      message: expect.stringContaining(
        "fallback error response also failed",
      ),
    });
    expect(warnings[1]?.message).toContain("records.save");
    expect(warnings[1]?.message).toContain("request-17");
  });

  it("does not send a fallback after a warning observer closes the responder", async () => {
    const sendEnvelope = vi.fn(async (_peerId: string, envelope: RpcEnvelope) => {
      if (envelope.kind === "response" && envelope.ok) {
        throw new Error("transport offline");
      }
    });
    let closeResponder = () => {};
    const { responder, warnings } = createResponder(sendEnvelope, () => {
      closeResponder();
    });
    closeResponder = () => responder.close();
    responder.register("records.save", {
      invoke: () => "saved",
      serial: false,
      queue: Promise.resolve(),
    });

    await responder.receiveRequest(request, "peer-7");

    expect(sendEnvelope).toHaveBeenCalledTimes(1);
    expect(warnings).toHaveLength(1);
  });

  it("preserves the legacy error shape for a handler failure", async () => {
    const handlerFailure = new RpcError("REMOTE_ERROR", "write rejected", {
      reason: "read-only",
    });
    const sent: RpcEnvelope[] = [];
    const { responder, warnings } = createResponder(async (_peerId, envelope) => {
      sent.push(envelope);
    });
    responder.register("records.save", {
      invoke: () => {
        throw handlerFailure;
      },
      serial: false,
      queue: Promise.resolve(),
    });

    await responder.receiveRequest(request, "peer-7");

    expect(sent).toEqual([
      {
        kind: "response",
        requestId: "request-17",
        ok: false,
        error: {
          code: "REMOTE_ERROR",
          message: "write rejected",
          details: { reason: "read-only" },
        },
      },
    ]);
    expect(warnings).toEqual([]);
  });

  it("uses the legacy fallback for an ordinary handler error", async () => {
    const sent: RpcEnvelope[] = [];
    const { responder } = createResponder(async (_peerId, envelope) => {
      sent.push(envelope);
    });
    responder.register("records.save", {
      invoke: () => {
        throw new Error("write rejected");
      },
      serial: false,
      queue: Promise.resolve(),
    });

    await responder.receiveRequest(request, "peer-7");

    expect(sent).toEqual([
      {
        kind: "response",
        requestId: "request-17",
        ok: false,
        error: { code: "REMOTE_ERROR", message: "write rejected" },
      },
    ]);
  });
});
