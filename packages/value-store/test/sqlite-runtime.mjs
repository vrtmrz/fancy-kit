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
  assert.deepEqual(await store.listKeys(), []);
  assert.equal(existsSync(filePath), false);
  assert.deepEqual(await store.listKeys({ limit: 0 }), []);
  assert.equal(existsSync(filePath), false);
  const text = "\ud800\0\ufeff\udfff";
  await store.writeBatch([{ type: "setValue", key: text, value: text }, { type: "setValue", key: text, value: "skip", ifAbsent: true }]);
  assert.equal(await store.getValue(text), text);
  const ordered = ["\ud83d\ude00", "\ue000", "\ud800", "\0", "a", "a\0", "aa", "\uffff"];
  for (const key of ordered) await store.setValue(`list:${key}`, "v");
  const expected = ordered.map(key => `list:${key}`).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  assert.deepEqual(await store.listKeys({ prefix: "list:" }), expected);
  assert.deepEqual(await store.listKeys({ prefix: "list:", lower: "list:a", lowerExclusive: true, upper: "list:\uffff", upperExclusive: true }), expected.filter(key => key > "list:a" && key < "list:\uffff"));
  assert.deepEqual(await store.listKeys({ prefix: "list:", limit: 2 }), expected.slice(0, 2));
  const pages = []; let lower; let finished = false;
  for (let iterations = 0; iterations <= expected.length + 1; iterations++) {
    const page = await store.listKeys({ prefix: "list:", ...(lower === undefined ? {} : { lower, lowerExclusive: true }), limit: 2 });
    if (page.length === 0) { finished = true; break; }
    const nextCursor = page.at(-1);
    if (lower !== undefined) assert.ok(nextCursor > lower, "pagination cursor must advance in UTF-16 order");
    pages.push(...page); lower = nextCursor;
  }
  assert.equal(finished, true, "pagination must terminate within the bounded iteration count");
  assert.deepEqual(pages, expected);
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
    const borrowed = createSqliteValueStore(db, { prefix: "", namespace: "clear" });
    const other = createSqliteValueStore(db, { prefix: "", namespace: "other" });
    await borrowed.setObject("key", null);
    for (const key of ["", "a", "a\uffff", "a\uffffx", "a\ufffe", "b", "\ufffe", "\uffff", "\uffffx", "\uffff\uffff"]) await borrowed.setValue(key, "v");
    await other.setValue("key", "keep");
    const prefixA = createSqliteValueStore(db, { prefix: "a", namespace: "clear" });
    await prefixA.clear();
    assert.deepEqual(await borrowed.listKeys(), ["", "b", "key", "\ufffe", "\uffff", "\uffffx", "\uffff\uffff"]);
    const prefixFFFF = createSqliteValueStore(db, { prefix: "\uffff", namespace: "clear" });
    await prefixFFFF.clear();
    assert.deepEqual(await borrowed.listKeys(), ["", "b", "key", "\ufffe"]);
    await borrowed.clear();
    assert.deepEqual(await borrowed.listKeys(), []);
    assert.equal(await other.getValue("key"), "keep");
    await Promise.all([borrowed.dispose(), other.dispose(), prefixA.dispose(), prefixFFFF.dispose()]);
    assert.equal(db.prepare("SELECT count(*) AS n FROM fancy_kit_values").get().n, 1);
  } finally { db.close(); }
  console.log("PASS: native SQLite capacity, exact strings, batch, scope, disposal, and reopen");
} finally { rmSync(root, { recursive: true, force: true }); }
