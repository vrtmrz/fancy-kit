import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// With an installed package, use '@vrtmrz/value-store/node-sqlite'.
import { createSqliteFileValueStore } from "../dist/sqlite/index.js";

// A storage example for livesync-bridge PR #93. The caller owns the file path,
// legacy enumeration, and stopping producers before import, reset, or disposal.
const root = mkdtempSync(join(tmpdir(), "kit-peer-state-example-"));
const filePath = join(root, "state.sqlite");
const stores = [];
const importMarker = "imported-local-storage";
function open(namespace) {
  const store = createSqliteFileValueStore({ filePath, prefix: "", namespace });
  stores.push(store);
  return store;
}

// Supply a snapshot of exact legacy key/string pairs before starting sync.
async function importSnapshot(state, metadata, snapshot) {
  if (await metadata.getValue(importMarker) !== null) return;
  // Bound each batch and yield between chunks so native work does not monopolise a turn.
  for (let i = 0; i < snapshot.length; i += 1000) {
    await state.writeBatch(snapshot.slice(i, i + 1000).map(([key, value]) => ({
      type: "setValue", key, value, ifAbsent: true,
    })));
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  // A failed batch leaves the marker absent; rerunning preserves copied/newer entries.
  await metadata.setValue(importMarker, "done");
}

try {
  let state = open("peer-state");
  let metadata = open("peer-state-meta");
  // Treat complete keys from Bridge's _getKey() as opaque; do not add another prefix.
  const statKey = "vault-storage-./vault/-file-stat-folder/ノート.md";
  const sinceKey = 'couchdb-checkpoint:["remote","./vault/","https://example.invalid/couch","db","since"]';
  const source = new Map([[statKey, "1740000000000-123"], [sinceKey, "40-old"], ["empty", ""]]);
  const snapshot = [...source];
  await state.setValue(sinceKey, "41-newer");
  await importSnapshot(state, metadata, snapshot);
  assert.equal(await state.getValue(statKey), "1740000000000-123");
  assert.equal(await state.getValue(sinceKey), "41-newer");
  assert.equal(await state.getValue("empty"), "");
  assert.deepEqual([...source], snapshot, "import leaves the legacy source unchanged");

  let since = await state.getValue(sinceKey, "");
  async function advanceSince(seq) {
    await state.setValue(sinceKey, seq);
    since = seq;
  }
  // Return this Promise from a checkpoint callback so its caller waits for persistence.
  await advanceSince("42-next");
  assert.equal(since, "42-next");
  await state.dispose();
  // Disposal provides a deterministic failed write for this small example.
  await assert.rejects(advanceSince("43-unsaved"), { code: "unavailable" });
  assert.equal(since, "42-next", "a failed save must not advance the reconnect position");
  await metadata.dispose();

  state = open("peer-state");
  metadata = open("peer-state-meta");
  assert.equal(await state.getValue(sinceKey), "42-next");
  assert.equal(await state.getValue(statKey), "1740000000000-123");
  source.set("legacy-added-later", "not imported");
  await importSnapshot(state, metadata, [...source]);
  assert.equal(await state.getValue("legacy-added-later"), null, "the completion marker survives reopening");

  // With producers stopped, persist suppression before clearing only the state namespace.
  await metadata.setValue(importMarker, "reset");
  await state.clear();
  await state.dispose();
  await metadata.dispose();
  state = open("peer-state");
  metadata = open("peer-state-meta");
  await importSnapshot(state, metadata, [...source]);
  assert.equal(await state.getValue(statKey), null);
  assert.equal(await state.getValue(sinceKey), null);
  assert.equal(await metadata.getValue(importMarker), "reset", "reset must not resurrect retained legacy state");
  assert.deepEqual([...source], [...snapshot, ["legacy-added-later", "not imported"]]);
  console.log("PASS: peer-state example preserves strings, destination precedence, checkpoint ordering, reopen, and reset suppression");
} finally {
  try { await Promise.all(stores.map((store) => store.dispose())); }
  finally { rmSync(root, { recursive: true, force: true }); }
}
