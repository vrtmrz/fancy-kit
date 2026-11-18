import assert from "node:assert/strict";
import { MessageChannel } from "node:worker_threads";
import { RpcRoom } from "@vrtmrz/rpc/p2p";
import { call, defineContract } from "@vrtmrz/rpc";
import {
  connectWorkerRpc,
  createWorkerPool,
  readWorkerStream,
  serveWorkerRpc,
  serveWorkerStream,
} from "@vrtmrz/rpc/worker";

function withTimeout(promise, operation) {
  let timeout;
  return Promise.race([
    promise,
    new Promise((_resolve, reject) => {
      timeout = setTimeout(() => reject(new Error(`${operation} timed out.`)), 5_000);
    }),
  ]).finally(() => clearTimeout(timeout));
}

function createP2PPair() {
  const listeners = [new Set(), new Set()];
  return [0, 1].map((side) => ({
    send(message, peerId) {
      assert.equal(peerId, side === 0 ? "right" : "left");
      queueMicrotask(() => {
        for (const listener of [...listeners[1 - side]]) {
          listener(structuredClone(message), side === 0 ? "left" : "right");
        }
      });
    },
    onMessage(listener) {
      listeners[side].add(listener);
      return () => listeners[side].delete(listener);
    },
  }));
}

const [leftTransport, rightTransport] = createP2PPair();
const leftRoom = new RpcRoom({ transport: leftTransport });
const rightRoom = new RpcRoom({ transport: rightTransport });
try {
  rightRoom.register("math.add", (_peerId, left, right) => left + right);
  assert.equal(await withTimeout(leftRoom.session("right").call("math.add", [19, 23]), "P2P request"), 42);
} finally {
  leftRoom.close();
  rightRoom.close();
}

const contract = defineContract({
  add: call(),
  read: call().transfer({ result: "required" }),
});
let terminationCount = 0;
let workerChannel;
let connection;
let lease;
let streamChannel;
let streamPort;
let reader;
let sourceCompleted = false;
let producerClosedResolve;
const producerClosed = new Promise((resolve) => {
  producerClosedResolve = resolve;
});
let server;
const pool = createWorkerPool({
  size: 1,
  createConnection() {
    workerChannel = new MessageChannel();
    const worker = {
      postMessage(message, transfer) {
        workerChannel.port1.postMessage(message, transfer);
      },
      addEventListener(type, listener) {
        workerChannel.port1.addEventListener(type, listener);
      },
      removeEventListener(type, listener) {
        workerChannel.port1.removeEventListener(type, listener);
      },
      terminate() {
        terminationCount += 1;
        workerChannel.port2.close();
      },
    };
    connection = connectWorkerRpc({ contract, createWorker: () => worker });
    server = serveWorkerRpc({
      contract,
      port: workerChannel.port2,
      register(endpoint) {
        endpoint.handle("add", (_context, left, right) => left + right);
        endpoint.handle("read", () => serveWorkerStream({
          createChannel() {
            streamChannel = new MessageChannel();
            streamChannel.port1.once("close", producerClosedResolve);
            return { port1: streamChannel.port1, port2: streamChannel.port2 };
          },
          maxChunkBytes: 32,
          async *createSource() {
            try {
              yield "first";
              yield new Uint8Array([3, 1, 4]);
            } finally {
              sourceCompleted = true;
            }
          },
        }));
      },
    });
    return connection;
  },
});

try {
  await withTimeout(pool.start(), "Worker pool prewarm");
  lease = await withTimeout(pool.acquire(), "Worker pool acquire");
  const client = lease.client;
  assert.equal(await withTimeout(client.call.add([19, 23]), "Worker unary request"), 42);

  streamPort = await withTimeout(client.call.read(), "Worker stream request");
  let readerClosedResolve;
  const readerClosed = new Promise((resolve) => {
    readerClosedResolve = resolve;
  });
  streamPort.once("close", readerClosedResolve);
  reader = readWorkerStream({ port: streamPort, maxChunkBytes: 32, signal: connection.signal });
  const chunks = [];
  for (let index = 0; index < 3; index += 1) {
    chunks.push(await withTimeout(reader.next(), `Worker stream read ${index + 1}`));
  }
  assert.deepEqual(chunks, [
    { done: false, value: "first" },
    { done: false, value: new Uint8Array([3, 1, 4]) },
    { done: true, value: undefined },
  ]);
  assert.equal(sourceCompleted, true);
  await withTimeout(Promise.all([producerClosed, readerClosed]), "Worker stream port shutdown");

  lease.release();
  lease = undefined;
  assert.equal(connection.signal.aborted, false);
  pool.close();
  assert.equal(connection.signal.aborted, true);
  assert.equal(terminationCount, 1);
} finally {
  lease?.release();
  pool.close();
  server?.close();
  workerChannel?.port1.close();
  workerChannel?.port2.close();
  streamChannel?.port1.close();
  streamChannel?.port2.close();
  try {
    await reader?.return?.();
  } finally {
    streamPort?.close();
  }
}
