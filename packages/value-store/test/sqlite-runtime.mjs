import assert from "node:assert/strict";
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createSqliteFileValueStore, createSqliteValueStore } from "../dist/sqlite/index.js";

const root = mkdtempSync(join(tmpdir(), "kit-sqlite-runtime-"));
try {
  const filePath = join(root, "native #? state.sqlite");
  const store = createSqliteFileValueStore({ filePath, prefix: "", namespace: "\ud800\0" });
  assert.equal(await store.getValue("missing"), null);
  assert.equal(existsSync(filePath), false);
  const text = "\ud800\0\ufeff\udfff";
  await store.writeBatch([{ type: "setValue", key: text, value: text }, { type: "setValue", key: text, value: "skip", ifAbsent: true }]);
  assert.equal(await store.getValue(text), text);
  // Exercise the capacity motivating PR #93, without a localStorage dependency.
  const large = "x".repeat(11 * 1024 * 1024);
  await store.setValue("large", large);
  await store.dispose();
  const reopened = createSqliteFileValueStore({ filePath, prefix: "", namespace: "\ud800\0" });
  assert.equal(await reopened.getValue(text), text);
  assert.equal(await reopened.getValue("large"), large);
  await reopened.clear();
  assert.equal(await reopened.getValue(text), null);
  await reopened.dispose();
  assert.equal(existsSync(filePath + "-wal"), false);
  const db = new DatabaseSync(":memory:");
  try {
    const borrowed = createSqliteValueStore(db, { prefix: "" });
    await borrowed.setObject("key", null); await borrowed.dispose();
    assert.equal(db.prepare("SELECT count(*) AS n FROM fancy_kit_values").get().n, 1);
  } finally { db.close(); }
  console.log("PASS: native SQLite capacity, exact strings, batch, scope, disposal, and reopen");
} finally { rmSync(root, { recursive: true, force: true }); }
