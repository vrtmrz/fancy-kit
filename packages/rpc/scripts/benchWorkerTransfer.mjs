import { performance } from "node:perf_hooks";
import { assertReachableTransferables, createMessagePortTransport } from "../dist/worker.js";

function computeStats(samplesNs) {
  const sorted = [...samplesNs].sort((a, b) => a - b);
  const sum = samplesNs.reduce((acc, v) => acc + v, 0);
  const meanUs = sum / samplesNs.length / 1_000;
  const minUs = sorted[0] / 1_000;
  const medianUs = sorted[Math.floor(sorted.length * 0.5)] / 1_000;
  const p95Us = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] / 1_000;
  const maxUs = sorted[sorted.length - 1] / 1_000;
  return {
    samples: samplesNs.length,
    minUs: Number(minUs.toFixed(2)),
    medianUs: Number(medianUs.toFixed(2)),
    p95Us: Number(p95Us.toFixed(2)),
    meanUs: Number(meanUs.toFixed(2)),
    maxUs: Number(maxUs.toFixed(2)),
  };
}

function makeSmallPayload(view) {
  return {
    kind: "request",
    version: 1,
    requestId: "req-1",
    sender: { peerId: "host", instanceId: "h-1" },
    target: { peerId: "worker", instanceId: "w-1" },
    method: "processChunk",
    args: [{ id: "chunk-1", offset: 0, view }],
  };
}

function makeManyRecordsPayload(recordCount, view) {
  const records = [];
  for (let i = 0; i < recordCount; i += 1) {
    records.push({
      id: i,
      key: `doc-${i}`,
      rev: `1-${i}`,
      selected: (i & 1) === 0,
    });
  }
  return {
    kind: "request",
    version: 1,
    requestId: "req-many",
    sender: { peerId: "host", instanceId: "h-1" },
    target: { peerId: "worker", instanceId: "w-1" },
    method: "applyBatch",
    args: [{ records, view }],
  };
}

function measureValidation(label, buildFixture, warmupCount, repetitions) {
  const { payload, transfer } = buildFixture();
  for (let i = 0; i < warmupCount; i += 1) {
    assertReachableTransferables(payload, transfer);
  }
  const samplesNs = [];
  for (let i = 0; i < repetitions; i += 1) {
    const t0 = performance.now();
    assertReachableTransferables(payload, transfer);
    const t1 = performance.now();
    samplesNs.push((t1 - t0) * 1_000_000);
  }
  return { workload: label, phase: "validation-only", ...computeStats(samplesNs) };
}

async function measureRawPostMessage(label, buildFixture, repetitions) {
  const channel = new MessageChannel();
  channel.port2.onmessage = () => {};
  const fixtures = [];
  for (let i = 0; i < repetitions; i += 1) {
    fixtures.push(buildFixture());
  }
  const samplesNs = [];
  for (let i = 0; i < repetitions; i += 1) {
    const { payload, transfer } = fixtures[i];
    const t0 = performance.now();
    channel.port1.postMessage(payload, transfer);
    const t1 = performance.now();
    samplesNs.push((t1 - t0) * 1_000_000);
  }
  channel.port1.close();
  channel.port2.close();
  return { workload: label, phase: "raw-postMessage", ...computeStats(samplesNs) };
}

async function measureTransportSend(label, buildFixture, repetitions) {
  const channel = new MessageChannel();
  channel.port2.onmessage = () => {};
  const remotePeer = { peerId: "worker", instanceId: "w-1" };
  const transport = createMessagePortTransport({
    port: channel.port1,
    remotePeer,
    portOwnership: "owned",
  });
  const fixtures = [];
  for (let i = 0; i < repetitions; i += 1) {
    fixtures.push(buildFixture());
  }
  const samplesNs = [];
  for (let i = 0; i < repetitions; i += 1) {
    const { payload, transfer } = fixtures[i];
    const t0 = performance.now();
    transport.send(remotePeer, payload, undefined, transfer);
    const t1 = performance.now();
    samplesNs.push((t1 - t0) * 1_000_000);
  }
  await transport.close();
  channel.port2.close();
  return { workload: label, phase: "transport-send-total", ...computeStats(samplesNs) };
}

const smallBuilder = () => {
  const view = new Uint8Array(64);
  return { payload: makeSmallPayload(view), transfer: [view.buffer] };
};
const largeBuilder = () => {
  const view = new Uint8Array(16 * 1024 * 1024);
  return { payload: makeSmallPayload(view), transfer: [view.buffer] };
};
const manyRecordsBuilder = () => {
  const view = new Uint8Array(64);
  return { payload: makeManyRecordsPayload(500, view), transfer: [view.buffer] };
};

const results = [
  measureValidation("small-binary-64B", smallBuilder, 100, 1000),
  await measureRawPostMessage("small-binary-64B", smallBuilder, 200),
  await measureTransportSend("small-binary-64B", smallBuilder, 200),

  measureValidation("large-buffer-16MiB", largeBuilder, 50, 500),
  await measureRawPostMessage("large-buffer-16MiB", largeBuilder, 20),
  await measureTransportSend("large-buffer-16MiB", largeBuilder, 20),

  measureValidation("many-records-500x4fields", manyRecordsBuilder, 30, 200),
  await measureRawPostMessage("many-records-500x4fields", manyRecordsBuilder, 100),
  await measureTransportSend("many-records-500x4fields", manyRecordsBuilder, 100),
];

console.log(
  JSON.stringify(
    {
      runtime: `Node.js ${process.version} (${process.platform} ${process.arch})`,
      results,
    },
    null,
    2,
  ),
);
