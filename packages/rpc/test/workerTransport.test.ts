import { Worker as NodeWorker } from "node:worker_threads";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RpcError,
  call,
  createRpcEndpoint,
  defineContract,
  withTransfer,
  type PeerAddress,
  type RpcCodec,
  type RpcEnvelope,
} from "../src/index.js";
import {
  assertReachableTransferables,
  createIdentityCodec,
  createMessagePortTransport,
  type MessageEventLike,
  type MessagePortLike,
  type WorkerTransferPort,
} from "../src/worker.js";
import { createCancelController } from "../src/cancelSignal.js";

const workerContract = defineContract({
  echoText: call<[text: string], string>(),
  echoStructured: call<[payload: { readonly ok: boolean; readonly list: number[] }], number>(),
  echoBlobSize: call<[blob: Blob], number>(),
  copyBytes: call<[bytes: Uint8Array], Uint8Array>(),
  reverseTransfer: call<[bytes: Uint8Array], Uint8Array>().transfer({
    input: "required",
    result: "required",
  }),
  optionalTransfer: call<[bytes: Uint8Array], Uint8Array>().transfer({
    input: "optional",
    result: "optional",
  }),
});

describe("Worker and MessagePort transport (@vrtmrz/rpc/worker)", () => {
  const cleanups: Array<() => void | Promise<void>> = [];

  afterEach(async () => {
    while (cleanups.length > 0) {
      const cleanup = cleanups.pop()!;
      await cleanup();
    }
  });

  it("installs message listener before calling port.start() and detaches on close", async () => {
    const events: string[] = [];
    const listeners = new Set<(event: MessageEventLike<unknown>) => void>();
    const port: MessagePortLike<ArrayBuffer> = {
      postMessage: vi.fn(),
      addEventListener(type, listener) {
        events.push(`add:${type}`);
        listeners.add(listener);
      },
      removeEventListener(type, listener) {
        events.push(`remove:${type}`);
        listeners.delete(listener);
      },
      start() {
        events.push("start");
      },
      close() {
        events.push("close");
      },
    };

    const transport = createMessagePortTransport({
      port,
      remotePeer: { peerId: "worker", instanceId: "w-1" },
      portOwnership: "owned",
    });

    const ep = createRpcEndpoint({
      contract: workerContract,
      codec: createIdentityCodec(),
      transport,
      localPeer: { peerId: "host", instanceId: "h-1" },
      transportOwnership: "owned",
    });

    expect(events).toEqual(["add:message", "start"]);
    expect(listeners.size).toBe(1);

    await ep.closeAsync();
    expect(listeners.size).toBe(0);
    expect(events).toEqual(["add:message", "start", "remove:message", "close"]);
  });

  it("transfers buffers bidirectionally over real MessageChannel and supports strings, Blobs, Uint8Array, and structured data", async () => {
    const channel = new MessageChannel();
    const hostPeer: PeerAddress = { peerId: "host", instanceId: "host-1" };
    const workerPeer: PeerAddress = { peerId: "worker", instanceId: "worker-1" };

    const hostTransport = createMessagePortTransport({
      port: channel.port1 as unknown as MessagePortLike<ArrayBuffer>,
      remotePeer: workerPeer,
      portOwnership: "owned",
    });
    const workerTransport = createMessagePortTransport({
      port: channel.port2 as unknown as MessagePortLike<ArrayBuffer>,
      remotePeer: hostPeer,
      portOwnership: "owned",
    });

    const hostEp = createRpcEndpoint({
      contract: workerContract,
      codec: createIdentityCodec(),
      transport: hostTransport,
      localPeer: hostPeer,
      transportOwnership: "owned",
    });
    const workerEp = createRpcEndpoint({
      contract: workerContract,
      codec: createIdentityCodec(),
      transport: workerTransport,
      localPeer: workerPeer,
      transportOwnership: "owned",
    });
    cleanups.push(async () => {
      await hostEp.closeAsync();
      await workerEp.closeAsync();
    });

    workerEp.handle("echoText", (_ctx, text) => `hello:${text}`);
    workerEp.handle("echoStructured", (_ctx, payload) =>
      payload.ok ? payload.list.reduce((a, b) => a + b, 0) : -1,
    );
    workerEp.handle("echoBlobSize", async (_ctx, blob) => (await blob.arrayBuffer()).byteLength);
    workerEp.handle("copyBytes", (_ctx, bytes) => new Uint8Array(bytes.map((b) => b + 1)));
    let handlerOutputView: Uint8Array | undefined;
    let handlerOutputBuffer: ArrayBuffer | undefined;
    workerEp.handle("reverseTransfer", (_ctx, bytes) => {
      const out = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        out[i] = bytes[bytes.length - 1 - i]!;
      }
      handlerOutputView = out;
      handlerOutputBuffer = out.buffer;
      return withTransfer(out, [out.buffer]);
    });

    const client = hostEp.bindPeer(workerPeer);

    await expect(client.call.echoText(["world"])).resolves.toBe("hello:world");
    await expect(
      client.call.echoStructured([{ ok: true, list: [10, 20, 12] }]),
    ).resolves.toBe(42);
    await expect(client.call.echoBlobSize([new Blob(["abcdef"])])).resolves.toBe(6);

    const copiedIn = new Uint8Array([1, 2, 3]);
    const copiedOut = await client.call.copyBytes([copiedIn]);
    expect(copiedIn.byteLength).toBe(3);
    expect([...copiedOut]).toEqual([2, 3, 4]);

    const txInput = new Uint8Array([10, 20, 30, 40]);
    const txInputBuffer = txInput.buffer;
    const reversed = await client.call.reverseTransfer([
      withTransfer(txInput, [txInputBuffer]),
    ]);
    // Both caller input buffer and handler output buffer are detached by MessageChannel transfer.
    expect(txInput.byteLength).toBe(0);
    expect(txInputBuffer.byteLength).toBe(0);
    expect(handlerOutputView?.byteLength).toBe(0);
    expect(handlerOutputBuffer?.byteLength).toBe(0);
    expect([...reversed]).toEqual([40, 30, 20, 10]);
  });

  it("rejects duplicate, omitted, unreachable, unsupported, and post-encode replacement resources", async () => {
    const channel = new MessageChannel();
    const hostPeer: PeerAddress = { peerId: "host", instanceId: "host-1" };
    const workerPeer: PeerAddress = { peerId: "worker", instanceId: "worker-1" };
    cleanups.push(() => {
      channel.port1.close();
      channel.port2.close();
    });

    const bytes = new Uint8Array([1, 2, 3]);
    const other = new Uint8Array([4, 5, 6]);

    // Direct assertReachableTransferables checks:
    expect(() =>
      assertReachableTransferables({ bytes }, [bytes.buffer, bytes.buffer]),
    ).toThrowError(RpcError);
    expect(() =>
      assertReachableTransferables({ bytes }, [other.buffer]),
    ).toThrowError(RpcError);
    expect(() =>
      assertReachableTransferables({ bytes }, [bytes as unknown as ArrayBuffer]),
    ).toThrowError(RpcError);
    const plainObj = { nested: 1 };
    expect(() =>
      assertReachableTransferables({ plainObj }, [plainObj as unknown as ArrayBuffer]),
    ).toThrowError(RpcError);
    expect(() =>
      assertReachableTransferables({ blob: new Blob(["x"]) }, [new Blob(["x"]) as unknown as ArrayBuffer]),
    ).toThrowError(RpcError);
    if (typeof SharedArrayBuffer !== "undefined") {
      const sab = new SharedArrayBuffer(4);
      expect(() =>
        assertReachableTransferables({ sab }, [sab as unknown as ArrayBuffer]),
      ).toThrowError(RpcError);
    }
    const alreadyDetached = new ArrayBuffer(4);
    structuredClone(alreadyDetached, { transfer: [alreadyDetached] });
    expect(() =>
      assertReachableTransferables({ alreadyDetached }, [alreadyDetached]),
    ).toThrowError(RpcError);

    // Post-encode replacement copy MUST NOT satisfy required transfer of original designated buffer.
    const baseCodec = createIdentityCodec();
    const copyingCodec: RpcCodec<RpcEnvelope, RpcEnvelope> = {
      encode(envelope) {
        if (envelope.kind === "request" || (envelope.kind === "response" && envelope.ok)) {
          return structuredClone(envelope);
        }
        return baseCodec.encode(envelope);
      },
      decode: (wire) => baseCodec.decode(wire),
    };

    const hostTransport = createMessagePortTransport({
      port: channel.port1 as unknown as MessagePortLike<ArrayBuffer>,
      remotePeer: workerPeer,
    });
    const postSpy = vi.spyOn(channel.port1, "postMessage");

    const hostEp = createRpcEndpoint({
      contract: workerContract,
      codec: copyingCodec,
      transport: hostTransport,
      localPeer: hostPeer,
    });
    cleanups.push(() => hostEp.close());

    const client = hostEp.bindPeer(workerPeer);
    const input = new Uint8Array([7, 8, 9]);
    await expect(
      client.call.reverseTransfer([withTransfer(input, [input.buffer])]),
    ).rejects.toMatchObject({ code: "transfer-failed" });

    // Rejected before posting and without detaching original buffer.
    expect(postSpy).not.toHaveBeenCalled();
    expect(input.byteLength).toBe(3);

    // Server-side response transfer failure (replacement copy after encode) fails call with transfer-failed.
    const realHostEp = createRpcEndpoint({
      contract: workerContract,
      codec: createIdentityCodec(),
      transport: hostTransport,
      localPeer: hostPeer,
    });
    const workerTransport = createMessagePortTransport({
      port: channel.port2 as unknown as MessagePortLike<ArrayBuffer>,
      remotePeer: hostPeer,
    });
    const workerEp = createRpcEndpoint({
      contract: workerContract,
      codec: copyingCodec,
      transport: workerTransport,
      localPeer: workerPeer,
    });
    cleanups.push(() => {
      realHostEp.close();
      workerEp.close();
    });

    workerEp.handle("reverseTransfer", (_ctx, data) => {
      const out = new Uint8Array(data);
      return withTransfer(out, [out.buffer]);
    });

    const realClient = realHostEp.bindPeer(workerPeer);
    const sendBuf = new Uint8Array([1, 2]);
    await expect(
      realClient.call.reverseTransfer([withTransfer(sendBuf, [sendBuf.buffer])]),
    ).rejects.toMatchObject({ code: "transfer-failed" });
  });

  it("handles cancellation before posting, cancellation after detachment, and send-deliver-then-reject without rollback", async () => {
    const hostPeer: PeerAddress = { peerId: "host", instanceId: "host-1" };
    const workerPeer: PeerAddress = { peerId: "worker", instanceId: "worker-1" };

    const listeners = new Set<(event: MessageEventLike<unknown>) => void>();
    const deliveredPayloads: unknown[] = [];
    let throwAfterDeliver = false;

    const customPort: MessagePortLike<ArrayBuffer> = {
      postMessage(message, transfer) {
        // Simulate real platform detachment of transferred buffers on post.
        const clone = structuredClone(message, { transfer });
        deliveredPayloads.push(clone);
        if (throwAfterDeliver) {
          throw new Error("platform-post-rejected-after-detachment");
        }
      },
      addEventListener(_type, listener) {
        listeners.add(listener);
      },
      removeEventListener(_type, listener) {
        listeners.delete(listener);
      },
    };

    const transport = createMessagePortTransport({
      port: customPort,
      remotePeer: workerPeer,
    });
    const ep = createRpcEndpoint({
      contract: workerContract,
      codec: createIdentityCodec(),
      transport,
      localPeer: hostPeer,
    });
    cleanups.push(() => ep.close());
    const client = ep.bindPeer(workerPeer);

    // 1. Pre-aborted call does not post or detach buffer.
    const preAborted = createCancelController();
    preAborted.abort(new Error("pre-abort"));
    const buf1 = new Uint8Array([1, 2, 3]);
    await expect(
      client.call.reverseTransfer([withTransfer(buf1, [buf1.buffer])], {
        signal: preAborted.signal,
      }),
    ).rejects.toMatchObject({ code: "aborted" });
    expect(buf1.byteLength).toBe(3);
    expect(deliveredPayloads).toHaveLength(0);

    // 2. Cancellation after detachment rejects aborted and leaves buffer detached.
    const postDetachCancel = createCancelController();
    const buf2 = new Uint8Array([4, 5, 6]);
    const call2 = client.call.reverseTransfer([withTransfer(buf2, [buf2.buffer])], {
      signal: postDetachCancel.signal,
    });
    expect(buf2.byteLength).toBe(0);
    expect(deliveredPayloads).toHaveLength(1);
    postDetachCancel.abort(new Error("abort-after-detach"));
    await expect(call2).rejects.toMatchObject({ code: "aborted" });
    expect(buf2.byteLength).toBe(0);

    // 3. Send that delivers then throws fails without promising rollback.
    throwAfterDeliver = true;
    const buf3 = new Uint8Array([7, 8, 9]);
    await expect(
      client.call.reverseTransfer([withTransfer(buf3, [buf3.buffer])]),
    ).rejects.toMatchObject({ code: "transfer-failed" });
    expect(deliveredPayloads.map((p) => (p as RpcEnvelope).kind)).toEqual([
      "request",
      "cancel",
      "request",
    ]);
    expect(buf3.byteLength).toBe(0);
  });

  it("performs 1 codec call, 1 postMessage call, and 0 structuredClone calls per unary direction", async () => {
    const channel = new MessageChannel();
    const hostPeer: PeerAddress = { peerId: "host", instanceId: "host-1" };
    const workerPeer: PeerAddress = { peerId: "worker", instanceId: "worker-1" };

    const identityHost = createIdentityCodec();
    const identityWorker = createIdentityCodec();
    const encodeHostSpy = vi.spyOn(identityHost, "encode");
    const decodeHostSpy = vi.spyOn(identityHost, "decode");
    const encodeWorkerSpy = vi.spyOn(identityWorker, "encode");
    const decodeWorkerSpy = vi.spyOn(identityWorker, "decode");
    const post1Spy = vi.spyOn(channel.port1, "postMessage");
    const post2Spy = vi.spyOn(channel.port2, "postMessage");
    const cloneSpy = vi.spyOn(globalThis, "structuredClone");

    const hostEp = createRpcEndpoint({
      contract: workerContract,
      codec: identityHost,
      transport: createMessagePortTransport({
        port: channel.port1 as unknown as MessagePortLike<ArrayBuffer>,
        remotePeer: workerPeer,
        portOwnership: "owned",
      }),
      localPeer: hostPeer,
      transportOwnership: "owned",
    });
    const workerEp = createRpcEndpoint({
      contract: workerContract,
      codec: identityWorker,
      transport: createMessagePortTransport({
        port: channel.port2 as unknown as MessagePortLike<ArrayBuffer>,
        remotePeer: hostPeer,
        portOwnership: "owned",
      }),
      localPeer: workerPeer,
      transportOwnership: "owned",
    });
    cleanups.push(async () => {
      cloneSpy.mockRestore();
      await hostEp.closeAsync();
      await workerEp.closeAsync();
    });

    workerEp.handle("echoText", (_ctx, text) => text.toUpperCase());
    const client = hostEp.bindPeer(workerPeer);
    await expect(client.call.echoText(["ping"])).resolves.toBe("PING");

    expect(encodeHostSpy).toHaveBeenCalledTimes(1);
    expect(post1Spy).toHaveBeenCalledTimes(1);
    expect(decodeWorkerSpy).toHaveBeenCalledTimes(1);
    expect(encodeWorkerSpy).toHaveBeenCalledTimes(1);
    expect(post2Spy).toHaveBeenCalledTimes(1);
    expect(decodeHostSpy).toHaveBeenCalledTimes(1);
    expect(cloneSpy).not.toHaveBeenCalled();
  });

  it("transfers buffers across a real Node worker_threads Worker boundary", async () => {
    const workerCode = `
      const { parentPort } = require("node:worker_threads");
      let lastOutputByteLength = -1;
      parentPort.on("message", (msg) => {
        if (!msg || msg.kind !== "request") return;
        if (msg.method === "reverse") {
          const input = msg.args[0];
          const out = new Uint8Array(input.length);
          for (let i = 0; i < input.length; i++) out[i] = input[input.length - 1 - i];
          const outBuf = out.buffer;
          parentPort.postMessage(
            {
              kind: "response",
              version: 1,
              requestId: msg.requestId,
              sender: msg.target,
              target: msg.sender,
              ok: true,
              result: out,
            },
            [outBuf],
          );
          lastOutputByteLength = outBuf.byteLength;
        } else if (msg.method === "lastOutputByteLength") {
          parentPort.postMessage(
            {
              kind: "response",
              version: 1,
              requestId: msg.requestId,
              sender: msg.target,
              target: msg.sender,
              ok: true,
              result: lastOutputByteLength,
            },
            [],
          );
        }
      });
    `;

    const worker = new NodeWorker(workerCode, { eval: true });
    const listenerWrappers = new Map<
      (event: MessageEventLike<unknown>) => void,
      (data: unknown) => void
    >();

    const nodeWorkerPort: MessagePortLike<ArrayBuffer> = {
      postMessage(message, transfer) {
        worker.postMessage(message, transfer);
      },
      addEventListener(_type, listener) {
        const wrapper = (data: unknown) => listener({ data });
        listenerWrappers.set(listener, wrapper);
        worker.on("message", wrapper);
      },
      removeEventListener(_type, listener) {
        const wrapper = listenerWrappers.get(listener);
        if (wrapper) {
          listenerWrappers.delete(listener);
          worker.off("message", wrapper);
        }
      },
      async terminate() {
        await worker.terminate();
      },
    };

    const hostPeer: PeerAddress = { peerId: "host", instanceId: "h-thread" };
    const workerPeer: PeerAddress = { peerId: "node-worker", instanceId: "nw-1" };
    const threadContract = defineContract({
      reverse: call<[bytes: Uint8Array], Uint8Array>().transfer({
        input: "required",
        result: "required",
      }),
      lastOutputByteLength: call<[], number>(),
    });

    const ep = createRpcEndpoint({
      contract: threadContract,
      codec: createIdentityCodec(),
      transport: createMessagePortTransport({
        port: nodeWorkerPort,
        remotePeer: workerPeer,
        portOwnership: "owned",
      }),
      localPeer: hostPeer,
      transportOwnership: "owned",
    });

    const client = ep.bindPeer(workerPeer);
    const buf = new Uint8Array([11, 22, 33, 44]);
    const result = await client.call.reverse([withTransfer(buf, [buf.buffer])]);
    expect(buf.byteLength).toBe(0);
    expect([...result]).toEqual([44, 33, 22, 11]);
    await expect(client.call.lastOutputByteLength()).resolves.toBe(0);

    let terminateResolved = false;
    const origTerminate = nodeWorkerPort.terminate!;
    nodeWorkerPort.terminate = async () => {
      await origTerminate();
      terminateResolved = true;
    };
    await ep.closeAsync();
    expect(terminateResolved).toBe(true);
  });

  it("enforces explicit binary-data-and-ports opt-in for MessagePort forwarding and snapshots transport remotePeer", async () => {
    const channel = new MessageChannel();
    const forwarded = new MessageChannel();
    const defaultChannel = new MessageChannel();
    // Verify genuine Node MessagePort satisfies WorkerTransferPort structurally without casts.
    const nodePortAsTransfer: WorkerTransferPort = forwarded.port2;
    const hostPeer: PeerAddress = { peerId: "host", instanceId: "h-port" };
    const workerPeer: PeerAddress = { peerId: "worker", instanceId: "w-port" };

    // Default profile rejects MessagePort at runtime as well as statically.
    const defaultTransport = createMessagePortTransport({
      port: defaultChannel.port1 as unknown as MessagePortLike<never>,
      remotePeer: workerPeer,
    });
    expect(() =>
      defaultTransport.send(
        workerPeer,
        { p: forwarded.port2 },
        undefined,
        [forwarded.port2 as unknown as ArrayBuffer],
      ),
    ).toThrowError(expect.objectContaining({ code: "transfer-failed" }));
    expect(() =>
      assertReachableTransferables(
        [forwarded.port2],
        [forwarded.port2 as unknown as ArrayBuffer],
      ),
    ).toThrowError(expect.objectContaining({ code: "transfer-failed" }));

    // Snapshot & validation of remotePeer at transport creation, plus unknown profile rejection.
    expect(() =>
      createMessagePortTransport({
        port: defaultChannel.port1 as unknown as MessagePortLike<never>,
        remotePeer: { peerId: "", instanceId: "x" },
      }),
    ).toThrowError(expect.objectContaining({ code: "invalid-contract" }));
    expect(() =>
      createMessagePortTransport({
        port: defaultChannel.port1 as unknown as MessagePortLike<never>,
        remotePeer: workerPeer,
        transferProfile: "bogus-profile" as unknown as "binary-data",
      }),
    ).toThrowError(expect.objectContaining({ code: "unsupported-profile" }));

    let remotePeerReads = 0;
    let mutablePeerId = "worker";
    const remotePeerInput = {
      extra: "ignored",
      get peerId() {
        remotePeerReads += 1;
        return mutablePeerId;
      },
      get instanceId() {
        remotePeerReads += 1;
        return "w-snap";
      },
    };
    const snappedTransport = createMessagePortTransport({
      port: defaultChannel.port1 as unknown as MessagePortLike<never>,
      remotePeer: remotePeerInput,
    });
    expect(remotePeerReads).toBe(2);
    mutablePeerId = "mutated";
    snappedTransport.send({ peerId: "worker", instanceId: "w-snap" }, { ok: true });
    expect(remotePeerReads).toBe(2);

    const portContract = defineContract({
      sendPort: call<[p: WorkerTransferPort], string>().transfer({ input: "required" }),
      missingResTransfer: call<[b: Uint8Array], Uint8Array>().transfer({
        input: "required",
        result: "required",
      }),
    });

    const epHost = createRpcEndpoint({
      contract: portContract,
      codec: createIdentityCodec(),
      transport: createMessagePortTransport({
        port: channel.port1 as unknown as MessagePortLike<never>,
        remotePeer: workerPeer,
        portOwnership: "owned",
        transferProfile: "binary-data-and-ports",
      }),
      localPeer: hostPeer,
      transportOwnership: "owned",
    });
    const epWorker = createRpcEndpoint({
      contract: portContract,
      codec: createIdentityCodec(),
      transport: createMessagePortTransport({
        port: channel.port2 as unknown as MessagePortLike<never>,
        remotePeer: hostPeer,
        portOwnership: "owned",
        transferProfile: "binary-data-and-ports",
      }),
      localPeer: workerPeer,
      transportOwnership: "owned",
    });
    cleanups.push(async () => {
      defaultChannel.port1.close();
      defaultChannel.port2.close();
      forwarded.port1.close();
      forwarded.port2.close();
      await epHost.closeAsync();
      await epWorker.closeAsync();
    });

    // Helper also accepts MessagePort under explicit binary-data-and-ports profile.
    expect(
      assertReachableTransferables([nodePortAsTransfer], [nodePortAsTransfer], {
        transferProfile: "binary-data-and-ports",
      }),
    ).toEqual([nodePortAsTransfer]);

    // Structural-typing limitation (WD-5): fake port-shaped object fails runtime host-object check.
    const fakePostCalls = vi.fn();
    const fakePort: WorkerTransferPort = {
      postMessage: fakePostCalls,
      start() {},
      close() {},
    };
    expect(() =>
      assertReachableTransferables([fakePort], [fakePort], {
        transferProfile: "binary-data-and-ports",
      }),
    ).toThrowError(expect.objectContaining({ code: "transfer-failed" }));
    expect(fakePostCalls).not.toHaveBeenCalled();

    // Reachable MessagePort omitted from transfer list rejects before post under WD-3.
    const companionBytes = new Uint8Array([7, 8]);
    expect(() =>
      assertReachableTransferables(
        { bytes: companionBytes, port: forwarded.port2 },
        [companionBytes.buffer],
        { transferProfile: "binary-data-and-ports" },
      ),
    ).toThrowError(expect.objectContaining({ code: "transfer-failed" }));
    expect(companionBytes.byteLength).toBe(2);

    epWorker.handle("sendPort", (_ctx, receivedPort) => {
      receivedPort.postMessage("via-transferred-port");
      receivedPort.close();
      return "port-ok";
    });
    // Server omits withTransfer on result: "required" method -> must fail call with transfer-failed (TRANSFER-4).
    epWorker.handle("missingResTransfer", (_ctx, b) => new Uint8Array(b) as never);

    const client = epHost.bindPeer(workerPeer);
    const portMsgPromise = new Promise<unknown>((resolve) => {
      forwarded.port1.addEventListener(
        "message",
        (ev) => resolve((ev as unknown as MessageEventLike).data),
        { once: true },
      );
      forwarded.port1.start();
    });

    await expect(
      client.call.sendPort([withTransfer(nodePortAsTransfer, [nodePortAsTransfer])]),
    ).resolves.toBe("port-ok");
    await expect(portMsgPromise).resolves.toBe("via-transferred-port");

    // Fake port cast rejected before post when invoked via endpoint as well.
    await expect(
      client.call.sendPort([withTransfer(fakePort, [fakePort])]),
    ).rejects.toMatchObject({ code: "transfer-failed" });

    // Client omits withTransfer at runtime -> rejects transfer-failed without posting.
    const rawBuf = new Uint8Array([1, 2]);
    await expect(
      client.call.missingResTransfer([rawBuf as never]),
    ).rejects.toMatchObject({ code: "transfer-failed" });
    await expect(
      client.call.missingResTransfer([withTransfer(rawBuf, [])]),
    ).rejects.toMatchObject({ code: "transfer-failed" });

    // Client sends withTransfer, server forgets withTransfer -> transfer-failed.
    await expect(
      client.call.missingResTransfer([withTransfer(rawBuf, [rawBuf.buffer])]),
    ).rejects.toMatchObject({ code: "transfer-failed" });
  });

  it("enforces the strict binary-data profile on non-empty transfer sends and preserves copy-only compatibility (WD-1..WD-7)", async () => {
    const channel = new MessageChannel();
    const peer: PeerAddress = { peerId: "remote", instanceId: "r-wd" };
    let postCount = 0;
    const countedPort: MessagePortLike<never> = {
      postMessage(msg, transfer) {
        postCount += 1;
        channel.port1.postMessage(msg, transfer as never);
      },
      addEventListener(type, listener) {
        channel.port1.addEventListener(type, listener as never);
      },
      removeEventListener(type, listener) {
        channel.port1.removeEventListener(type, listener as never);
      },
      start() {
        channel.port1.start();
      },
      close() {
        channel.port1.close();
      },
    };
    const transport = createMessagePortTransport({
      port: countedPort,
      remotePeer: peer,
    });
    const received: unknown[] = [];
    channel.port2.addEventListener("message", (ev) => {
      received.push((ev as unknown as MessageEventLike).data);
    });
    channel.port2.start();
    cleanups.push(() => {
      channel.port1.close();
      channel.port2.close();
    });

    const nextMessage = () =>
      new Promise<unknown>((resolve) => {
        if (received.length > 0) {
          resolve(received.shift());
        } else {
          channel.port2.addEventListener("message", () => resolve(received.shift()), {
            once: true,
          });
        }
      });

    // 1. Positive binary-data shapes: primitives, views, shared buffer aliasing, null-proto, sparse/extra arrays, __proto__ data prop, cycles, and ignored non-enum/symbol data.
    const sharedBacking = new ArrayBuffer(8);
    const viewA = new Uint8Array(sharedBacking, 0, 4);
    viewA.set([10, 20, 30, 40]);
    const viewB = new Int32Array(sharedBacking, 4, 1);
    viewB[0] = 777;
    const directBuf = new Uint8Array([5, 6]).buffer;
    const dataViewBuf = new Uint8Array([7, 8]).buffer;
    const sparseArr: unknown[] = [];
    sparseArr[2] = directBuf;
    const extraPropArr = Object.assign([], { tag: new DataView(dataViewBuf) });
    const nullProtoRecord = Object.assign(Object.create(null) as Record<string, unknown>, {
      big: 99n,
      und: undefined,
      nil: null,
      bool: true,
      num: 12.5,
      str: "hello",
    });
    const protoNamedBuf = new Uint8Array([9, 10]).buffer;
    Object.defineProperty(nullProtoRecord, "__proto__", {
      value: new Uint8Array(protoNamedBuf),
      enumerable: true,
      configurable: true,
    });
    const hiddenDataBuf = new Uint8Array([11]).buffer;
    const symbolDataBuf = new Uint8Array([12]).buffer;
    const cyclic: Record<string, unknown> = { viewA, viewB };
    cyclic.self = cyclic;
    Object.defineProperty(cyclic, "hidden", { value: hiddenDataBuf, enumerable: false });
    Object.defineProperty(cyclic, Symbol("hiddenSym"), { value: symbolDataBuf, enumerable: true });

    const allowedPayload = {
      nullProtoRecord,
      sparseArr,
      extraPropArr,
      cyclic,
      repeated: nullProtoRecord,
    };
    transport.send(peer, allowedPayload, undefined, [
      sharedBacking,
      directBuf,
      dataViewBuf,
      protoNamedBuf,
    ]);
    expect(postCount).toBe(1);
    expect(sharedBacking.byteLength).toBe(0);
    expect(directBuf.byteLength).toBe(0);
    expect(dataViewBuf.byteLength).toBe(0);
    expect(protoNamedBuf.byteLength).toBe(0);
    expect(hiddenDataBuf.byteLength).toBe(1);
    expect(symbolDataBuf.byteLength).toBe(1);

    const recvAllowed = (await nextMessage()) as {
      readonly nullProtoRecord: Record<string, unknown>;
      readonly sparseArr: unknown[];
      readonly extraPropArr: { readonly tag: DataView };
      readonly cyclic: {
        readonly viewA: Uint8Array;
        readonly viewB: Int32Array;
        readonly self: unknown;
      };
    };
    expect(recvAllowed.nullProtoRecord.big).toBe(99n);
    expect(
      [...(Object.getOwnPropertyDescriptor(recvAllowed.nullProtoRecord, "__proto__")!.value as Uint8Array)],
    ).toEqual([9, 10]);
    expect(new Uint8Array(recvAllowed.sparseArr[2] as ArrayBuffer)).toEqual(new Uint8Array([5, 6]));
    expect([recvAllowed.extraPropArr.tag.getUint8(0), recvAllowed.extraPropArr.tag.getUint8(1)]).toEqual([
      7, 8,
    ]);
    expect([...recvAllowed.cyclic.viewA]).toEqual([10, 20, 30, 40]);
    expect(recvAllowed.cyclic.viewB[0]).toBe(777);
    expect(recvAllowed.cyclic.self).toBe(recvAllowed.cyclic);

    // Non-enumerable and symbol data properties MUST NOT establish reachability.
    const unreachHidden = new Uint8Array([13]);
    const recWithHidden = {};
    Object.defineProperty(recWithHidden, "hidden", { value: unreachHidden, enumerable: false });
    const postBeforeHidden = postCount;
    expect(() =>
      transport.send(peer, recWithHidden, undefined, [unreachHidden.buffer]),
    ).toThrowError(expect.objectContaining({ code: "transfer-failed" }));
    expect(postCount).toBe(postBeforeHidden);
    expect([...unreachHidden]).toEqual([13]);

    const unreachSym = new Uint8Array([14]);
    const recWithSym = { [Symbol("sym")]: unreachSym };
    expect(() =>
      transport.send(peer, recWithSym, undefined, [unreachSym.buffer]),
    ).toThrowError(expect.objectContaining({ code: "transfer-failed" }));
    expect(postCount).toBe(postBeforeHidden);
    expect([...unreachSym]).toEqual([14]);

    // 2. Excluded built-ins, subclasses, Node Buffer, custom prototypes, symbols, and functions fail before postMessage.
    class CustomRecord {
      readonly bytes: Uint8Array;
      constructor(bytes: Uint8Array) {
        this.bytes = bytes;
      }
    }
    class ArraySubclass extends Array {}

    let tagGetterReads = 0;
    const tagGetterSpoofedDate = Object.assign(new Date(0), {
      bytes: new Uint8Array([1, 2]),
    });
    Object.defineProperty(tagGetterSpoofedDate, Symbol.toStringTag, {
      get() {
        tagGetterReads += 1;
        return "Object";
      },
    });
    let mapEntriesCalls = 0;
    const overriddenMap = new Map<string, Uint8Array>();
    Object.defineProperty(overriddenMap, "entries", {
      value: function* () {
        mapEntriesCalls += 1;
        yield ["fake", new Uint8Array([9])];
      },
    });
    const fakeArrSubclass = new ArraySubclass();
    const arrSubBytes = new Uint8Array([15, 16]);
    fakeArrSubclass.push(arrSubBytes);

    const rejectedPayloads: Array<{
      readonly label: string;
      readonly value: unknown;
      readonly bytes: Uint8Array<ArrayBuffer>;
    }> = [
      { label: "Date", value: Object.assign(new Date(0), { b: new Uint8Array([1, 2]) }), bytes: new Uint8Array([1, 2]) },
      { label: "RegExp", value: /abc/, bytes: new Uint8Array([1, 2]) },
      { label: "Error", value: new Error("boom", { cause: new Uint8Array([1, 2]) }), bytes: new Uint8Array([1, 2]) },
      { label: "Map", value: new Map([["k", new Uint8Array([1, 2])]]), bytes: new Uint8Array([1, 2]) },
      { label: "Set", value: new Set([new Uint8Array([1, 2])]), bytes: new Uint8Array([1, 2]) },
      { label: "Promise", value: Promise.resolve(1), bytes: new Uint8Array([1, 2]) },
      { label: "Blob", value: new Blob(["abc"]), bytes: new Uint8Array([1, 2]) },
      { label: "ClassInstance", value: new CustomRecord(new Uint8Array([1, 2])), bytes: new Uint8Array([1, 2]) },
      { label: "BoxedNumber", value: new Number(42), bytes: new Uint8Array([1, 2]) },
      { label: "ArraySubclass", value: fakeArrSubclass, bytes: arrSubBytes },
      { label: "FakeArrayProto", value: Object.create(Array.prototype), bytes: new Uint8Array([1, 2]) },
      { label: "FakeBufferProto", value: Object.create(ArrayBuffer.prototype), bytes: new Uint8Array([1, 2]) },
      { label: "FakeViewProto", value: Object.create(Uint8Array.prototype), bytes: new Uint8Array([1, 2]) },
      { label: "SymbolTagSpoof", value: tagGetterSpoofedDate, bytes: tagGetterSpoofedDate.bytes },
      { label: "OverriddenMap", value: overriddenMap, bytes: new Uint8Array([1, 2]) },
      { label: "SymbolValue", value: { s: Symbol("x") }, bytes: new Uint8Array([1, 2]) },
      { label: "FunctionValue", value: { f: () => 1 }, bytes: new Uint8Array([1, 2]) },
    ];

    for (const item of rejectedPayloads) {
      const wrap =
        item.label === "ArraySubclass" || item.label === "SymbolTagSpoof"
          ? { item: item.value }
          : { item: item.value, buf: item.bytes };
      expect(
        () => transport.send(peer, wrap, undefined, [item.bytes.buffer]),
        item.label,
      ).toThrowError(expect.objectContaining({ code: "transfer-failed" }));
      expect(postCount, item.label).toBe(postBeforeHidden);
      expect(item.bytes.byteLength, item.label).toBeGreaterThan(0);
    }
    expect(tagGetterReads).toBe(0);
    expect(mapEntriesCalls).toBe(0);

    // 3. Node Buffer is excluded from binary-data transfer payloads.
    const nodeBuf = Buffer.from([21, 22, 23]);
    const companionOwned = new Uint8Array([24, 25]);
    expect(() =>
      transport.send(peer, { nodeBuf, companionOwned }, undefined, [companionOwned.buffer]),
    ).toThrowError(expect.objectContaining({ code: "transfer-failed" }));
    expect(postCount).toBe(postBeforeHidden);
    expect([...nodeBuf]).toEqual([21, 22, 23]);
    expect([...companionOwned]).toEqual([24, 25]);

    // 4. SharedArrayBuffer and SharedArrayBuffer-backed view mixed with owned ArrayBuffer fail before post.
    const sab = new SharedArrayBuffer(4);
    const sabView = new Uint8Array(sab);
    sabView.set([1, 2, 3, 4]);
    const ownedBytes = new Uint8Array([31, 32]);
    expect(() =>
      transport.send(peer, { sabView, ownedBytes }, undefined, [ownedBytes.buffer]),
    ).toThrowError(expect.objectContaining({ code: "transfer-failed" }));
    expect(postCount).toBe(postBeforeHidden);
    expect([...ownedBytes]).toEqual([31, 32]);
    expect(() =>
      transport.send(peer, { sab, ownedBytes }, undefined, [ownedBytes.buffer]),
    ).toThrowError(expect.objectContaining({ code: "transfer-failed" }));
    expect(postCount).toBe(postBeforeHidden);
    expect([...ownedBytes]).toEqual([31, 32]);

    // 5. All container accessors (enumerable/non-enumerable, getter/setter, symbol-keyed, array indices)
    //    and overridden own `.buffer` properties on binary views reject without invocation.
    let accessorCalls = 0;
    const stableBytes = new Uint8Array([41, 42]);
    const stableGetterObj = {
      get bytes() {
        accessorCalls += 1;
        return stableBytes;
      },
    };
    const nonEnumGetterObj = { bytes: stableBytes };
    Object.defineProperty(nonEnumGetterObj, "secret", {
      enumerable: false,
      get() {
        accessorCalls += 1;
        return 1;
      },
    });
    const setterObj: Record<string, unknown> = { bytes: stableBytes };
    Object.defineProperty(setterObj, "writeOnly", {
      enumerable: false,
      set(_v: unknown) {
        accessorCalls += 1;
      },
    });
    const symGetterObj: Record<PropertyKey, unknown> = { bytes: stableBytes };
    Object.defineProperty(symGetterObj, Symbol("trap"), {
      enumerable: false,
      get() {
        accessorCalls += 1;
        return 2;
      },
    });
    const accessorArr: unknown[] = [stableBytes];
    Object.defineProperty(accessorArr, "1", {
      enumerable: true,
      get() {
        accessorCalls += 1;
        return 3;
      },
    });

    for (const accPayload of [
      stableGetterObj,
      nonEnumGetterObj,
      setterObj,
      symGetterObj,
      accessorArr,
    ]) {
      expect(() =>
        transport.send(peer, accPayload, undefined, [stableBytes.buffer]),
      ).toThrowError(expect.objectContaining({ code: "transfer-failed" }));
      expect(postCount).toBe(postBeforeHidden);
      expect([...stableBytes]).toEqual([41, 42]);
    }
    expect(accessorCalls).toBe(0);

    // Overridden own `.buffer` descriptor on Uint8Array rejects even when the real buffer is designated.
    const viewWithCustomBuffer = new Uint8Array([51, 52]);
    const realBuffer = viewWithCustomBuffer.buffer;
    let bufferGetterCalls = 0;
    Object.defineProperty(viewWithCustomBuffer, "buffer", {
      configurable: true,
      get() {
        bufferGetterCalls += 1;
        return realBuffer;
      },
    });
    expect(() =>
      transport.send(peer, { v: viewWithCustomBuffer }, undefined, [realBuffer]),
    ).toThrowError(expect.objectContaining({ code: "transfer-failed" }));
    expect(bufferGetterCalls).toBe(0);
    expect(postCount).toBe(postBeforeHidden);
    expect([...viewWithCustomBuffer]).toEqual([51, 52]);

    // 6. Copy-only compatibility: empty transfer list delegates Date/Map/Set/Blob/SharedArrayBuffer/getters.
    transport.send(peer, {
      date: new Date(1234),
      blob: new Blob(["copy-ok"]),
      map: new Map([["a", 1]]),
      sab,
      getter: stableGetterObj,
    });
    expect(accessorCalls).toBe(1);
    const recvCopy = (await nextMessage()) as {
      readonly date: Date;
      readonly blob: Blob;
      readonly map: Map<string, number>;
      readonly sab: SharedArrayBuffer;
      readonly getter: { readonly bytes: Uint8Array };
    };
    expect(recvCopy.date.getTime()).toBe(1234);
    expect(await recvCopy.blob.text()).toBe("copy-ok");
    expect(recvCopy.map.get("a")).toBe(1);
    expect(recvCopy.sab).toBeInstanceOf(SharedArrayBuffer);
    expect([...recvCopy.getter.bytes]).toEqual([41, 42]);
  });

  it("allows custom codecs to convert Map/Error into binary-data while preserving buffer identity", async () => {
    const channel = new MessageChannel();
    const hostPeer: PeerAddress = { peerId: "host", instanceId: "h-codec" };
    const workerPeer: PeerAddress = { peerId: "worker", instanceId: "w-codec" };

    const domainContract = defineContract({
      transformMap: call<
        [entries: Map<string, Uint8Array>, note: Error],
        Map<string, Uint8Array>
      >().transfer({ input: "required", result: "required" }),
    });

    interface WireMapEntry {
      readonly __wireMap: true;
      readonly pairs: ReadonlyArray<readonly [string, Uint8Array]>;
      readonly noteMessage?: string;
    }

    const toWireValue = (val: unknown): unknown => {
      if (val instanceof Map) {
        return {
          __wireMap: true,
          pairs: [...val.entries()],
        } satisfies WireMapEntry;
      }
      if (val instanceof Error) {
        return { message: val.message };
      }
      return val;
    };

    const fromWireValue = (val: unknown): unknown => {
      if (typeof val === "object" && val !== null && "__wireMap" in val) {
        const entry = val as WireMapEntry;
        return new Map(entry.pairs);
      }
      if (
        typeof val === "object" &&
        val !== null &&
        "message" in val &&
        typeof (val as { message: unknown }).message === "string"
      ) {
        return new Error((val as { message: string }).message);
      }
      return val;
    };

    const codec: RpcCodec<RpcEnvelope, RpcEnvelope> = {
      encode(envelope) {
        switch (envelope.kind) {
          case "request":
          case "notify":
            return { ...envelope, args: envelope.args.map(toWireValue) };
          case "response":
            return envelope.ok ? { ...envelope, result: toWireValue(envelope.result) } : envelope;
          case "cancel":
            return envelope;
        }
      },
      decode(raw) {
        const env = raw as RpcEnvelope;
        switch (env.kind) {
          case "request":
          case "notify":
            return { ...env, args: env.args.map(fromWireValue) };
          case "response":
            return env.ok ? { ...env, result: fromWireValue(env.result) } : env;
          case "cancel":
            return env;
        }
      },
    };

    const epHost = createRpcEndpoint({
      contract: domainContract,
      codec,
      transport: createMessagePortTransport({
        port: channel.port1 as unknown as MessagePortLike<never>,
        remotePeer: workerPeer,
        portOwnership: "owned",
      }),
      localPeer: hostPeer,
      transportOwnership: "owned",
    });
    const epWorker = createRpcEndpoint({
      contract: domainContract,
      codec,
      transport: createMessagePortTransport({
        port: channel.port2 as unknown as MessagePortLike<never>,
        remotePeer: hostPeer,
        portOwnership: "owned",
      }),
      localPeer: workerPeer,
      transportOwnership: "owned",
    });
    cleanups.push(async () => {
      await epHost.closeAsync();
      await epWorker.closeAsync();
    });

    epWorker.handle("transformMap", (_ctx, map, err) => {
      const inBytes = map.get("in")!;
      const outBytes = new Uint8Array(inBytes.length);
      for (let i = 0; i < inBytes.length; i += 1) {
        outBytes[i] = inBytes[i]! ^ 0xff;
      }
      const outMap = new Map([[err.message, outBytes]]);
      return withTransfer(outMap, [outBytes.buffer]);
    });

    const inputBytes = new Uint8Array([1, 2, 3]);
    const inputMap = new Map([["in", inputBytes]]);
    const client = epHost.bindPeer(workerPeer);
    const resultMap = await client.call.transformMap([
      withTransfer(inputMap, [inputBytes.buffer]),
      new Error("xor"),
    ]);

    expect(inputBytes.byteLength).toBe(0);
    expect([...resultMap.get("xor")!]).toEqual([254, 253, 252]);
  });

  it("keeps validation container/descriptor inspection work independent of binary leaf byteLength (WD-7)", () => {
    const small = new Uint8Array(16);
    const large = new Uint8Array(64 * 1024 * 1024);

    const smallPayload = {
      header: { tag: "meta", flags: [1, 2, 3] },
      data: small,
    };
    const largePayload = {
      header: { tag: "meta", flags: [1, 2, 3] },
      data: large,
    };

    const ownKeysSpy = vi.spyOn(Reflect, "ownKeys");
    const descSpy = vi.spyOn(Object, "getOwnPropertyDescriptor");
    try {
      assertReachableTransferables(smallPayload, [small.buffer]);
      const smallOwnKeysCount = ownKeysSpy.mock.calls.length;
      const smallDescCount = descSpy.mock.calls.length;

      ownKeysSpy.mockClear();
      descSpy.mockClear();

      assertReachableTransferables(largePayload, [large.buffer]);
      const largeOwnKeysCount = ownKeysSpy.mock.calls.length;
      const largeDescCount = descSpy.mock.calls.length;

      expect(smallOwnKeysCount).toBeGreaterThan(0);
      expect(largeOwnKeysCount).toBe(smallOwnKeysCount);
      expect(largeDescCount).toBe(smallDescCount);
    } finally {
      ownKeysSpy.mockRestore();
      descSpy.mockRestore();
    }
  });

  it("rejects transfer-required bindings and runtime withTransfer on incapable transports dynamically", async () => {
    const sendSpy = vi.fn();
    const copyOnlyTransport = {
      capabilities: {
        supportsTransfer: false,
        guaranteesRequestBeforeCancel: true,
      },
      send: sendSpy,
      subscribe: () => () => undefined,
    };

    expect(() =>
      createRpcEndpoint({
        contract: workerContract,
        codec: createIdentityCodec(),
        transport: copyOnlyTransport as never,
        localPeer: { peerId: "host", instanceId: "h-dyn" },
      }),
    ).toThrowError(expect.objectContaining({ code: "unsupported-profile" }));

    const optionalOnlyContract = defineContract({
      copyEcho: call<[bytes: Uint8Array], Uint8Array>(),
      optTransfer: call<[bytes: Uint8Array], Uint8Array>().transfer({
        input: "optional",
        result: "optional",
      }),
    });
    const ep = createRpcEndpoint({
      contract: optionalOnlyContract,
      codec: createIdentityCodec(),
      transport: copyOnlyTransport,
      localPeer: { peerId: "host", instanceId: "h-dyn2" },
    });
    cleanups.push(() => ep.close());
    const client = ep.bindPeer({ peerId: "remote", instanceId: "r-dyn2" });
    const bytes = new Uint8Array([1, 2, 3]);
    await expect(
      client.call.optTransfer([withTransfer(bytes, [bytes.buffer] as never)]),
    ).rejects.toMatchObject({ code: "transfer-failed" });
    expect(sendSpy).not.toHaveBeenCalled();
    expect([...bytes]).toEqual([1, 2, 3]);
  });
});
