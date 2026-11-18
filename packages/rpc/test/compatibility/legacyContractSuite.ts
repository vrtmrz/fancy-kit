import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JsonValue, Room } from "../../src/service/contracts.js";
import { createLegacyPair } from "./legacyPair.js";
import type { LegacyFactoryOptions, LegacyRoomFactory } from "./legacyTypes.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** Runs the same protocol cases in both caller/receiver directions.
 * A baseline/baseline invocation validates the harness, not a future candidate.
 */
export function legacyContractSuite(
  label: string,
  left: LegacyRoomFactory,
  right: LegacyRoomFactory,
) {
  describe(label, () => {
    let pair: ReturnType<typeof createLegacyPair>;
    let rooms: Room<JsonValue, AbortSignal>[];
    beforeEach(() => {
      vi.useFakeTimers();
      pair = createLegacyPair();
      rooms = [];
    });
    afterEach(() => {
      for (const room of rooms) room.close();
      expect(pair.wire.a.listenerCount + pair.wire.b.listenerCount).toBe(0);
      expect(
        pair.a.lifecycleListenerCount + pair.b.lifecycleListenerCount,
      ).toBe(0);
      pair.wire.dispose();
      const remainingTimers = vi.getTimerCount();
      vi.useRealTimers();
      expect(remainingTimers).toBe(0);
    });

    for (const direction of ["left-to-right", "right-to-left"] as const) {
      describe(direction, () => {
        function setup(
          receiverOptions: Omit<LegacyFactoryOptions, "transport"> = {},
        ) {
          const forward = direction === "left-to-right";
          const callerSide = forward ? pair.a : pair.b;
          const receiverSide = forward ? pair.b : pair.a;
          const outgoing = forward ? pair.wire.a : pair.wire.b;
          const replies = forward ? pair.wire.b : pair.wire.a;
          const caller = (forward ? left : right)({
            transport: callerSide.transport,
            maxWirePayloadBytes: 256,
          });
          const receiver = (forward ? right : left)({
            transport: receiverSide.transport,
            maxWirePayloadBytes: 256,
            ...receiverOptions,
          });
          rooms.push(caller, receiver);
          return {
            caller,
            receiver,
            outgoing,
            replies,
            callerSide,
            receiverSide,
            session: caller.session(outgoing.remotePeer.peerId),
          };
        }

        it("round-trips ordinary and chunked calls after handshake", async () => {
          const h = setup();
          h.callerSide.join();
          h.receiverSide.join();
          h.receiver.register("db.echo", (peer, value: JsonValue) => ({
            peer,
            value,
          }));
          await expect(h.session.call("db.echo", ["small"])).resolves.toEqual({
            peer: h.outgoing.localPeer.peerId,
            value: "small",
          });
          const value = "あいう".repeat(200);
          await expect(h.session.call("db.echo", [value])).resolves.toEqual({
            peer: h.outgoing.localPeer.peerId,
            value,
          });
          expect(
            h.outgoing.sentMessages.some((m) => m.payload.wire === "chunk"),
          ).toBe(true);
          expect(
            h.replies.sentMessages.some(
              (m) =>
                m.payload.wire === "chunk-ack" &&
                m.payload.missing.length === 0,
            ),
          ).toBe(true);
        });

        it("keeps a void call response-bearing", async () => {
          const h = setup();
          const entered = deferred<void>();
          const release = deferred<void>();
          h.receiver.register("legacy/work", async () => {
            entered.resolve();
            await release.promise;
          });
          let settled = false;
          const result = h.session.call<void>("legacy/work").then(() => {
            settled = true;
          });
          await entered.promise;
          expect(settled).toBe(false);
          release.resolve();
          await result;
          expect(
            h.replies.sentMessages.some(
              (m) =>
                m.payload.wire === "raw" &&
                JSON.parse(m.payload.payload).kind === "response",
            ),
          ).toBe(true);
        });

        it("settles a notification without waiting for the remote handler", async () => {
          const h = setup();
          const entered = deferred<void>();
          const release = deferred<void>();
          h.receiver.register("legacy/progress", async () => {
            entered.resolve();
            await release.promise;
          });
          await h.session.notify("legacy/progress", [1]);
          await entered.promise;
          expect(vi.getTimerCount()).toBe(0);
          expect(h.replies.sentMessages).toHaveLength(0);
          release.resolve();
          await vi.advanceTimersByTimeAsync(0);
          expect(h.replies.sentMessages).toHaveLength(0);
        });

        it("propagates a remote handler error with legacy code", async () => {
          const h = setup();
          h.receiver.register("db.fail", () => {
            throw new Error("expected remote failure");
          });
          await expect(h.session.call("db.fail")).rejects.toMatchObject({
            code: "REMOTE_ERROR",
            message: "expected remote failure",
          });
        });

        it("cancels during asynchronous admission and does not run the handler", async () => {
          const entered = deferred<AbortSignal>();
          const admit = deferred<boolean>();
          const handler = vi.fn(() => "unexpected");
          const h = setup({
            canAcceptRequest: (_peer, _method, ctx) => {
              entered.resolve(ctx.signal);
              return admit.promise;
            },
          });
          h.receiver.register("db.wait", handler);
          const controller = new AbortController();
          const result = h.session.call("db.wait", [], {
            signal: controller.signal,
          });
          const rejected = expect(result).rejects.toMatchObject({
            code: "CANCELLED",
          });
          const signal = await entered.promise;
          controller.abort();
          await rejected;
          await vi.advanceTimersByTimeAsync(0);
          expect(signal.aborted).toBe(true);
          admit.resolve(true);
          await vi.advanceTimersByTimeAsync(0);
          expect(handler).not.toHaveBeenCalled();
          expect(h.replies.sentMessages).toHaveLength(0);
        });

        it("preserves silent denial and the legacy default deadline", async () => {
          const h = setup({ canAcceptRequest: () => false });
          const result = h.session.call("db.denied");
          const rejected = expect(result).rejects.toMatchObject({
            code: "TIMEOUT",
          });
          await vi.advanceTimersByTimeAsync(29999);
          expect(h.replies.sentMessages).toHaveLength(0);
          expect(vi.getTimerCount()).toBe(1);
          await vi.advanceTimersByTimeAsync(1);
          await rejected;
        });

        it("retains cancellation intent while the request send is held", async () => {
          const h = setup();
          const entered = deferred<AbortSignal>();
          const release = deferred<JsonValue>();
          h.receiver.registerCancellable("db.wait", (ctx) => {
            entered.resolve(ctx.signal);
            return release.promise;
          });
          h.outgoing.setSendSettlementMode("manual");
          const controller = new AbortController();
          const result = h.session.call("db.wait", [], {
            signal: controller.signal,
          });
          const rejected = expect(result).rejects.toMatchObject({
            code: "CANCELLED",
          });
          const signal = await entered.promise;
          controller.abort();
          await rejected;
          expect(h.outgoing.sentMessages).toHaveLength(1);
          expect(signal.aborted).toBe(false);
          h.outgoing.setSendSettlementMode("immediate");
          expect(h.outgoing.resolveNextSend()).toBe(true);
          await vi.advanceTimersByTimeAsync(0);
          expect(signal.aborted).toBe(true);
          release.resolve("late");
          await vi.advanceTimersByTimeAsync(0);
          expect(h.replies.sentMessages).toHaveLength(0);
        });

        it("rejects pending calls and aborts active handlers on peer departure", async () => {
          const h = setup();
          const entered = deferred<AbortSignal>();
          const release = deferred<JsonValue>();
          h.receiver.registerCancellable("db.wait", (ctx) => {
            entered.resolve(ctx.signal);
            return release.promise;
          });
          const result = h.session.call("db.wait");
          const rejected = expect(result).rejects.toMatchObject({
            code: "NOT_CONNECTED",
          });
          const signal = await entered.promise;
          h.callerSide.leave();
          h.receiverSide.leave();
          await rejected;
          expect(signal.aborted).toBe(true);
          release.resolve("late");
          await vi.advanceTimersByTimeAsync(0);
          expect(h.replies.sentMessages).toHaveLength(0);
        });
      });
    }
  });
}
