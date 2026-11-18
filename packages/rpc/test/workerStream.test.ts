import { MessageChannel } from "node:worker_threads";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCancelController } from "../src/cancelSignal.js";
import { RpcError } from "../src/RpcError.js";
import type { CancelSignal } from "../src/types.js";
import {
  createWorkerStreamBudget,
  readWorkerStream,
  serveWorkerStream,
  type WorkerStreamChunk,
  type WorkerStreamPort,
} from "../src/worker/stream.js";
import { createControllableScheduler } from "./facilities/controllableScheduler.js";

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
}

interface TestStream {
  readonly channel: MessageChannel;
  readonly scheduler: ReturnType<typeof createControllableScheduler>;
  readonly reader: AsyncIterableIterator<WorkerStreamChunk>;
}

const channels: MessageChannel[] = [];
const schedulers: Array<ReturnType<typeof createControllableScheduler>> = [];

afterEach(() => {
  for (const channel of channels.splice(0)) {
    try {
      channel.port1.close();
      channel.port2.close();
    } catch {
      // A transferred Node port may already be detached.
    }
  }
  for (const scheduler of schedulers.splice(0)) {
    scheduler.dispose();
  }
});

describe("Worker stream ports", () => {
  it("accepts a standard iterator yield with an omitted done field", async () => {
    const stream = createTestStream({
      maxChunkBytes: 16,
      createSource: () => ({
        [Symbol.asyncIterator]() {
          let yielded = false;
          return {
            async next() {
              if (yielded) {
                return { done: true, value: undefined } as const;
              }
              yielded = true;
              return { value: "yield" };
            },
          };
        },
      }),
    });
    await expect(stream.reader.next()).resolves.toEqual({ done: false, value: "yield" });
    await expect(stream.reader.next()).resolves.toEqual({ done: true, value: undefined });
  });

  it("uses the port's structured clone for copied views without a preliminary buffer copy", async () => {
    const input = new Uint8Array([9, 6, 2, 5]);
    const eagerCopy = vi.spyOn(input.buffer, "slice");
    const stream = createTestStream({
      maxChunkBytes: input.byteLength,
      createSource: () => oneChunk(input.subarray(1, 3)),
    });
    const result = await stream.reader.next();
    await stream.reader.return?.();
    expect(result).toEqual({ done: false, value: new Uint8Array([6, 2]) });
    expect(input.byteLength).toBe(4);
    expect(eagerCopy).not.toHaveBeenCalled();
  });

  it("reports an already closed connection before allocating ports", () => {
    const controller = createCancelController();
    const reason = new RpcError("disconnected", "Worker no longer available.");
    controller.abort(reason);
    const createChannel = vi.fn(() => { throw new Error("Unexpected channel allocation."); });
    expect(() => serveWorkerStream({
      createChannel,
      createSource: () => oneChunk("unused"),
      maxChunkBytes: 16,
      signal: controller.signal,
    })).toThrow(reason);
    expect(createChannel).not.toHaveBeenCalled();
  });

  it("returns a source created while its connection is being closed", async () => {
    const controller = createCancelController();
    const reason = new RpcError("disconnected", "Connection closed during source creation.");
    const next = vi.fn(async () => ({ done: true, value: undefined } as const));
    const releaseSource = vi.fn(async () => ({ done: true, value: undefined } as const));
    const stream = createTestStream({
      maxChunkBytes: 16,
      signal: controller.signal,
      createSource() {
        controller.abort(reason);
        return { [Symbol.asyncIterator]: () => ({ next, return: releaseSource }) };
      },
    });

    await expect(stream.reader.next()).rejects.toMatchObject({
      code: reason.code,
      message: reason.message,
    });
    expect(next).not.toHaveBeenCalled();
    expect(releaseSource).toHaveBeenCalledOnce();
  });

  it("creates its source on the first pull and does not prefetch", async () => {
    let sourceCreations = 0;
    let pulls = 0;
    const stream = createTestStream({
      maxChunkBytes: 16,
      createSource() {
        sourceCreations += 1;
        return {
          [Symbol.asyncIterator]() {
            return {
              async next(): Promise<IteratorResult<WorkerStreamChunk>> {
                pulls += 1;
                return pulls === 1
                  ? { done: false, value: "first" }
                  : { done: true, value: undefined };
              },
            };
          },
        };
      },
    });

    expect(sourceCreations).toBe(0);
    expect(pulls).toBe(0);
    await expect(stream.reader.next()).resolves.toEqual({ done: false, value: "first" });
    expect(sourceCreations).toBe(1);
    expect(pulls).toBe(1);
    await expect(stream.reader.next()).resolves.toEqual({ done: true, value: undefined });
    expect(pulls).toBe(2);
    await expect(stream.reader.next()).resolves.toEqual({ done: true, value: undefined });
    expect(stream.scheduler.pendingCount).toBe(0);
  });

  it("rejects chunks that exceed the producer or reader byte limit", async () => {
    const oversizedBytes = new Uint8Array(new ArrayBuffer(4));
    const producerLimitStream = createTestStream({
      maxChunkBytes: 2,
      createSource: () => oneChunk(oversizedBytes),
    });
    await expect(producerLimitStream.reader.next()).rejects.toMatchObject({
      code: "stream-protocol-error",
    });

    const readerLimitStream = createTestStream({
      maxChunkBytes: 4,
      readerMaxChunkBytes: 2,
      createSource: () => oneChunk(oversizedBytes),
    });
    await expect(readerLimitStream.reader.next()).rejects.toMatchObject({
      code: "stream-protocol-error",
    });

    const utf16BoundaryStream = createTestStream({
      maxChunkBytes: 2,
      createSource: () => oneChunk("é"),
    });
    await expect(utf16BoundaryStream.reader.next()).resolves.toEqual({
      done: false,
      value: "é",
    });

    const utf16OversizeStream = createTestStream({
      maxChunkBytes: 2,
      createSource: () => oneChunk("😀"),
    });
    await expect(utf16OversizeStream.reader.next()).rejects.toMatchObject({
      code: "stream-protocol-error",
    });
  });

  it("transfers the complete chunk buffer and detaches it on a native Node port", async () => {
    const bytes = new Uint8Array([3, 1, 4]);
    const backingBuffer = bytes.buffer;
    const stream = createTestStream({
      maxChunkBytes: bytes.byteLength,
      transferChunks: true,
      createSource: () => oneChunk(bytes),
    });

    const result = await stream.reader.next();
    expect(result).toEqual({ done: false, value: new Uint8Array([3, 1, 4]) });
    expect(backingBuffer.byteLength).toBe(0);
    await stream.reader.return?.();
  });

  it("rejects an incomplete backing view when chunk transfer is enabled", async () => {
    const backing = new ArrayBuffer(8);
    const partial = new Uint8Array(backing, 2, 4);
    const stream = createTestStream({
      maxChunkBytes: 8,
      transferChunks: true,
      createSource: () => oneChunk(partial),
    });

    await expect(stream.reader.next()).rejects.toMatchObject({
      code: "invalid-contract",
    });
    expect(backing.byteLength).toBe(8);
  });

  it("releases a cancelled read reservation so the next reader can pull", async () => {
    const firstPullStarted = createDeferred<void>();
    const firstSourceReturned = createDeferred<void>();
    let finishFirstPull!: (result: IteratorResult<Uint8Array<ArrayBuffer>>) => void;
    let firstSignal: CancelSignal | undefined;
    let firstReturnCalls = 0;
    let cancelledWaitSourceCreations = 0;
    let secondSourceCreations = 0;
    const budget = createWorkerStreamBudget(4);
    const first = createTestStream({
      maxChunkBytes: 4,
      budget,
      createSource(signal) {
        firstSignal = signal;
        return {
          [Symbol.asyncIterator]() {
            return {
              next(): Promise<IteratorResult<Uint8Array<ArrayBuffer>>> {
                firstPullStarted.resolve(undefined);
                return new Promise((resolve) => {
                  finishFirstPull = resolve;
                });
              },
              async return(): Promise<IteratorResult<Uint8Array<ArrayBuffer>>> {
                firstReturnCalls += 1;
                firstSourceReturned.resolve(undefined);
                return { done: true, value: undefined };
              },
            };
          },
        };
      },
    });
    const cancelledWait = createTestStream({
      maxChunkBytes: 4,
      budget,
      createSource() {
        cancelledWaitSourceCreations += 1;
        return oneChunk(new Uint8Array([0]));
      },
    });
    const second = createTestStream({
      maxChunkBytes: 4,
      budget,
      createSource() {
        secondSourceCreations += 1;
        return oneChunk(new Uint8Array([1, 2, 3, 4]));
      },
    });

    const firstRead = first.reader.next();
    await firstPullStarted.promise;
    const cancelledWaitRead = cancelledWait.reader.next();
    const secondRead = second.reader.next();
    await Promise.resolve();
    expect(cancelledWaitSourceCreations).toBe(0);
    expect(secondSourceCreations).toBe(0);

    await cancelledWait.reader.return?.();
    await expect(cancelledWaitRead).resolves.toEqual({ done: true, value: undefined });
    await first.reader.return?.();
    await expect(firstRead).resolves.toEqual({ done: true, value: undefined });
    await firstSourceReturned.promise;
    expect(firstSignal?.aborted).toBe(true);
    expect(firstReturnCalls).toBe(1);
    await expect(secondRead).resolves.toEqual({
      done: false,
      value: new Uint8Array([1, 2, 3, 4]),
    });
    expect(secondSourceCreations).toBe(1);
    finishFirstPull({ done: false, value: new Uint8Array([5, 6, 7, 8]) });
    await second.reader.return?.();
  });

  it("aborts a pending read and returns the source iterator", async () => {
    const sourcePullStarted = createDeferred<void>();
    const sourceReturned = createDeferred<void>();
    let finishPull!: (result: IteratorResult<string>) => void;
    let sourceSignal: CancelSignal | undefined;
    const connection = createCancelController();
    const stream = createTestStream({
      maxChunkBytes: 8,
      signal: connection.signal,
      createSource(signal) {
        sourceSignal = signal;
        return {
          [Symbol.asyncIterator]() {
            return {
              next(): Promise<IteratorResult<string>> {
                sourcePullStarted.resolve(undefined);
                return new Promise((resolve) => {
                  finishPull = resolve;
                });
              },
              async return(): Promise<IteratorResult<string>> {
                sourceReturned.resolve(undefined);
                return { done: true, value: undefined };
              },
            };
          },
        };
      },
    });
    const pendingRead = stream.reader.next();
    await sourcePullStarted.promise;

    connection.abort(new Error("connection ended"));

    await expect(pendingRead).rejects.toMatchObject({ code: "aborted" });
    await sourceReturned.promise;
    expect(sourceSignal?.aborted).toBe(true);
    finishPull({ done: false, value: "stale" });
  });

  it("expires an unclaimed port and reports timeout if it is opened later", async () => {
    const scheduler = createControllableScheduler();
    schedulers.push(scheduler);
    const channel = new MessageChannel();
    channels.push(channel);
    let sourceCreations = 0;
    const served = serveWorkerStream({
      createChannel: () => ({
        port1: channel.port1 as unknown as WorkerStreamPort,
        port2: channel.port2 as unknown as WorkerStreamPort,
      }),
      createSource() {
        sourceCreations += 1;
        return oneChunk("never");
      },
      maxChunkBytes: 16,
      claimTimeoutMs: 25,
      scheduler,
    });
    const transferredPort = structuredClone(served.value, {
      transfer: [...served.resources] as never[],
    }) as WorkerStreamPort;

    scheduler.advanceBy(24);
    expect(scheduler.pendingCount).toBe(1);
    scheduler.advanceBy(1);
    expect(scheduler.pendingCount).toBe(0);
    expect(sourceCreations).toBe(0);

    const reader = readWorkerStream({ port: transferredPort, maxChunkBytes: 16 });
    await expect(reader.next()).rejects.toMatchObject({ code: "timeout" });
  });

  it("rejects a concurrent next without interrupting the outstanding read", async () => {
    const pullStarted = createDeferred<void>();
    let finishPull!: (result: IteratorResult<string>) => void;
    const stream = createTestStream({
      maxChunkBytes: 8,
      createSource: () => ({
        [Symbol.asyncIterator]() {
          return {
            next(): Promise<IteratorResult<string>> {
              pullStarted.resolve(undefined);
              return new Promise((resolve) => {
                finishPull = resolve;
              });
            },
          };
        },
      }),
    });

    const firstRead = stream.reader.next();
    await pullStarted.promise;
    await expect(stream.reader.next()).rejects.toMatchObject({
      code: "stream-protocol-error",
    });
    finishPull({ done: false, value: "kept" });
    await expect(firstRead).resolves.toEqual({ done: false, value: "kept" });
    await stream.reader.return?.();
  });
});

function createTestStream(options: {
  readonly maxChunkBytes: number;
  readonly readerMaxChunkBytes?: number;
  readonly transferChunks?: boolean;
  readonly signal?: ReturnType<typeof createCancelController>["signal"];
  readonly budget?: ReturnType<typeof createWorkerStreamBudget>;
  readonly createSource: (signal: import("../src/types.js").CancelSignal) => AsyncIterable<WorkerStreamChunk>;
}): TestStream {
  const channel = new MessageChannel();
  channels.push(channel);
  const scheduler = createControllableScheduler();
  schedulers.push(scheduler);
  const served = serveWorkerStream({
    createChannel: () => ({
      port1: channel.port1 as unknown as WorkerStreamPort,
      port2: channel.port2 as unknown as WorkerStreamPort,
    }),
    createSource: options.createSource,
    maxChunkBytes: options.maxChunkBytes,
    ...(options.transferChunks !== undefined ? { transferChunks: options.transferChunks } : {}),
    ...(options.signal !== undefined ? { signal: options.signal } : {}),
    scheduler,
  });
  const receivingPort = structuredClone(served.value, {
    transfer: [...served.resources] as never[],
  }) as WorkerStreamPort;
  const reader = readWorkerStream({
    port: receivingPort,
    maxChunkBytes: options.readerMaxChunkBytes ?? options.maxChunkBytes,
    ...(options.budget !== undefined ? { budget: options.budget } : {}),
  });
  return { channel, scheduler, reader };
}

function oneChunk<T extends WorkerStreamChunk>(chunk: T): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator](): AsyncGenerator<T> {
      yield chunk;
    },
  };
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}
