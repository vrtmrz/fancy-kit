import assert from "node:assert/strict";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance, monitorEventLoopDelay } from "node:perf_hooks";
import { setImmediate, setTimeout } from "node:timers/promises";
import { createSqliteFileValueStore } from "../dist/sqlite/index.js";

// Manual, separate from functional gates. RSS is sampled, not an allocation profiler.
const count = 70_000;
const batchSize = 1000;
const text = JSON.stringify({ mtime: 1234567890, size: 1024, hash: "x".repeat(160) });
const root = mkdtempSync(join(tmpdir(), "kit-sqlite-benchmark-"));
const results = [];
try {
  for (const durability of ["full", "normal"]) {
    const filePath = join(root, durability + ".sqlite");
    const options = { filePath, prefix: "peer:", durability };
    const store = createSqliteFileValueStore(options);
    const eventLoop = monitorEventLoopDelay({ resolution: 10 });
    eventLoop.enable();
    const begin = performance.now();
    let maxBatchMs = 0;
    let sampledPeakRss = process.memoryUsage().rss;
    for (let offset = 0; offset < count; offset += batchSize) {
      const batch = Array.from({ length: Math.min(batchSize, count - offset) }, (_, index) => ({ type: "setValue", key: String(offset + index), value: text }));
      const start = performance.now();
      await store.writeBatch(batch);
      maxBatchMs = Math.max(maxBatchMs, performance.now() - start);
      sampledPeakRss = Math.max(sampledPeakRss, process.memoryUsage().rss);
      await setImmediate();
    }
    const importMs = performance.now() - begin;
    await store.dispose();
    const startup = performance.now();
    const reopened = createSqliteFileValueStore(options);
    assert.equal(await reopened.getValue("0"), text);
    const startupReadMs = performance.now() - startup;
    const reads = performance.now();
    for (let index = 0; index < count; index++) assert.equal(await reopened.getValue(String(index)), text);
    const verifyAllMs = performance.now() - reads;
    const individualStart = performance.now();
    for (let index = 0; index < 100; index++) await reopened.setValue("single:" + index, text);
    const individualWritesMs = performance.now() - individualStart;
    const idleReopenMs = [];
    for (let index = 0; index < 3; index++) {
      await setTimeout(1050);
      const start = performance.now();
      assert.equal(await reopened.getValue("0"), text);
      idleReopenMs.push(performance.now() - start);
    }
    await reopened.dispose();
    eventLoop.disable();
    results.push({ durability, rows: count, batchSize, importMs, maxBatchMs, sampledPeakRss, eventLoopDelayMaxMs: eventLoop.max / 1e6, startupReadMs, verifyAllMs, individualWrites: 100, individualWritesMs, idleReopenMs, databaseBytesAfterClose: statSync(filePath).size });
  }
  console.log(JSON.stringify({ runtime: process.version, platform: process.platform, architecture: process.arch, count, logicalValueBytes: Buffer.byteLength(text), results, limits: ["RSS sampled at batch boundaries", "Temporary local filesystem", "Single module and process", "Storage workload only; no Bridge synchronisation", "No hardware power-loss or statistically stable throughput claim"] }, null, 2));
} finally { rmSync(root, { recursive: true, force: true }); }
