import { afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { MemoryValueStore } from "../src/memory.js";
import { createJsonFileValueStore } from "../src/node/index.js";
import { createJsonFileValueStoreWithOperations } from "../src/node/files.js";
import { jsonFileOperations } from "../src/node/operations.js";
import { createSqliteFileValueStore, createSqliteValueStore } from "../src/sqlite/index.js";
import { ValueStoreError } from "../src/errors.js";
import type { ValueKeyListOptions } from "../src/contracts.js";
import { createEnhancedValueStore } from "../src/enhanced-store.js";

type Store = { listKeys(options?: ValueKeyListOptions): Promise<string[]>; setValue(key: string, value: string): Promise<void>; clear(): Promise<void>; dispose(): Promise<void> };
const roots: string[] = [];
const databases: DatabaseSync[] = [];
function root() { const path = mkdtempSync(join(tmpdir(), "value-key-listing-")); roots.push(path); return path; }
afterEach(() => {
  for (const db of databases.splice(0)) { try { db.close(); } catch { /* Already closed. */ } }
  for (const path of roots.splice(0)) rmSync(path, { recursive: true, force: true });
});

const edgeKeys = ["", "\0", "a", "a\0", "a\0b", "aa", "\ud800", "\ud83d\ude00", "\ue000", "\ufffd", "\uffff", "\uffffa", "\uffff\uffff"];
const sorted = (keys: string[]) => [...keys].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
type Serializer = { serialize(key: string, value: string): string; deserialize(key: string, value: string): string };
const adapters: Array<[string, (serializer?: Serializer) => Store]> = [
  ["memory", serializer => new MemoryValueStore(serializer === undefined ? {} : { serializer }) as unknown as Store],
  ["JSON file without prefix", serializer => createJsonFileValueStore({ filePath: join(root(), "state.json"), prefix: "", ...(serializer === undefined ? {} : { serializer }) }) as unknown as Store],
  ["JSON file with prefix", serializer => createJsonFileValueStore({ filePath: join(root(), "state.json"), prefix: "scope:", ...(serializer === undefined ? {} : { serializer }) }) as unknown as Store],
  ["SQLite file without prefix or namespace", serializer => createSqliteFileValueStore({ filePath: join(root(), "state.sqlite"), prefix: "", ...(serializer === undefined ? {} : { serializer }) }) as unknown as Store],
  ["SQLite file with prefix and namespace", serializer => createSqliteFileValueStore({ filePath: join(root(), "state.sqlite"), prefix: "scope:", namespace: "suite", ...(serializer === undefined ? {} : { serializer }) }) as unknown as Store],
  ["borrowed SQLite without prefix or namespace", serializer => { const db = new DatabaseSync(":memory:"); databases.push(db); return createSqliteValueStore(db, { prefix: "", ...(serializer === undefined ? {} : { serializer }) }) as unknown as Store; }],
  ["borrowed SQLite with prefix and namespace", serializer => { const db = new DatabaseSync(":memory:"); databases.push(db); return createSqliteValueStore(db, { prefix: "scope:", namespace: "suite", ...(serializer === undefined ? {} : { serializer }) }) as unknown as Store; }],
];

for (const [name, create] of adapters) describe(`ValueKeyLister contract: ${name}`, () => {
  it("lists empty and exact UTF-16 sorted logical keys", async () => {
    const store = create();
    expect(await store.listKeys()).toEqual([]);
    for (const key of edgeKeys) await store.setValue(key, "value");
    expect(await store.listKeys()).toEqual(sorted(edgeKeys));
    expect(await store.listKeys({ prefix: "" })).toEqual(sorted(edgeKeys));
    await store.dispose();
  });

  it("uses literal prefixes, strips physical scope, and intersects all bounds", async () => {
    const store = create();
    const keys = ["", "a", "a\0", "a\0b", "aa", "a\uffff", "a\uffffx", "b", "p;", "p:\uffff", "p:\uffffa", "p:\uffff\uffff", "\uffff", "\uffffa", "\uffff\uffff", "%_[]*?", "%_[]*?x", "x%_[]*?"];
    for (const key of keys) await store.setValue(key, "v");
    expect(await store.listKeys({ prefix: "a" })).toEqual(["a", "a\0", "a\0b", "aa", "a\uffff", "a\uffffx"]);
    expect(await store.listKeys({ prefix: "a\0" })).toEqual(["a\0", "a\0b"]);
    expect(await store.listKeys({ prefix: "%_[]*?" })).toEqual(["%_[]*?", "%_[]*?x"]);
    expect(await store.listKeys({ prefix: "a", lower: "aa" })).toEqual(["aa", "a\uffff", "a\uffffx"]);
    expect(await store.listKeys({ prefix: "a", lower: "a", lowerExclusive: false })).toEqual(["a", "a\0", "a\0b", "aa", "a\uffff", "a\uffffx"]);
    expect(await store.listKeys({ prefix: "a", lower: "a", lowerExclusive: true })).toEqual(["a\0", "a\0b", "aa", "a\uffff", "a\uffffx"]);
    expect(await store.listKeys({ prefix: "a", upper: "a\0b" })).toEqual(["a", "a\0", "a\0b"]);
    expect(await store.listKeys({ prefix: "a", lower: "a\0", lowerExclusive: true, upper: "aa", upperExclusive: true })).toEqual(["a\0b"]);
    expect(await store.listKeys({ lower: "aa", upper: "aa" })).toEqual(["aa"]);
    expect(await store.listKeys({ lower: "a", lowerExclusive: true, upper: "a\0" })).toEqual(["a\0"]);
    expect(await store.listKeys({ lower: "a", upper: "a", lowerExclusive: true })).toEqual([]);
    expect(await store.listKeys({ lower: "b", upper: "a" })).toEqual([]);
    expect(await store.listKeys({ prefix: "a", lower: "b", upper: "z" })).toEqual([]);
    expect(await store.listKeys({ prefix: "a", lower: "b" })).toEqual([]);
    expect(await store.listKeys({ prefix: "a", lower: "b", upper: "b" })).toEqual([]);
    expect(await store.listKeys({ prefix: "p:\uffff" })).toEqual(["p:\uffff", "p:\uffffa", "p:\uffff\uffff"]);
    expect(await store.listKeys({ prefix: "p:\uffff", lower: "p;" })).toEqual([]);
    expect(await store.listKeys({ prefix: "\uffff" })).toEqual(["\uffff", "\uffffa", "\uffff\uffff"]);
    expect(await store.listKeys({ prefix: "\uffff\uffff" })).toEqual(["\uffff\uffff"]);
    expect(await store.listKeys({ prefix: "a\uffff" })).toEqual(["a\uffff", "a\uffffx"]);
    expect(await store.listKeys({ prefix: "a", lower: "b" })).toEqual([]);
    await store.dispose();
  });

  it("supports limits and keyset pagination", async () => {
    const store = create();
    for (const key of edgeKeys) await store.setValue(key, "v");
    expect(await store.listKeys({ limit: 0 })).toEqual([]);
    expect(await store.listKeys({ limit: 1 })).toEqual(sorted(edgeKeys).slice(0, 1));
    expect(await store.listKeys({ limit: 4 })).toEqual(sorted(edgeKeys).slice(0, 4));
    expect(await store.listKeys({ limit: edgeKeys.length })).toEqual(sorted(edgeKeys));
    expect(await store.listKeys({ limit: 100 })).toEqual(sorted(edgeKeys));
    const expected = sorted(edgeKeys);
    const pages: string[] = []; let lower: string | undefined; let iterations = 0; let finished = false;
    while (iterations <= expected.length + 1) {
      iterations++;
      const page = await store.listKeys({ ...(lower === undefined ? {} : { lower, lowerExclusive: true }), limit: 2 });
      if (page.length === 0) { finished = true; break; }
      const nextCursor = page.at(-1)!;
      if (lower !== undefined) expect(nextCursor > lower).toBe(true);
      pages.push(...page); lower = nextCursor;
    }
    expect(finished).toBe(true); expect(pages).toEqual(expected);
    await store.dispose();
  });

  it("validates and snapshots own option data before asynchronous work", async () => {
    const store = create(); await store.setValue("a", "v");
    for (const input of [null, 1, "x", true, [], () => undefined]) await expect(store.listKeys(input as never)).rejects.toMatchObject({ code: "invalid-value" });
    let getterCalls = 0;
    const getter = Object.defineProperty({}, "prefix", { get() { getterCalls++; return "a"; } });
    await expect(store.listKeys(getter as never)).rejects.toMatchObject({ code: "invalid-value" });
    expect(getterCalls).toBe(0);
    const inherited = Object.create({ prefix: "missing", limit: 0 }) as ValueKeyListOptions;
    expect(await store.listKeys(inherited)).toEqual(["a"]);
    const proxyTrap = new Proxy({}, { getOwnPropertyDescriptor() { throw new Error("secret trap"); } });
    await expect(store.listKeys(proxyTrap as never)).rejects.toMatchObject({ code: "operation-failed" });
    const invalid = [
      { lower: 1 }, { upper: null }, { prefix: 2 }, { lowerExclusive: 1 }, { upperExclusive: "yes" },
      { lowerExclusive: true }, { upperExclusive: true }, ...[-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1].map(limit => ({ limit })),
    ];
    for (const options of invalid) {
      const { lower, upper } = options as { lower?: unknown; upper?: unknown };
      await expect(store.listKeys(options as never)).rejects.toMatchObject({ code: lower !== undefined || upper !== undefined ? "invalid-key" : "invalid-value" });
    }
    const options = { prefix: "a", limit: 1 };
    const pending = store.listKeys(options); options.prefix = "missing"; options.limit = 0;
    expect(await pending).toEqual(["a"]);
    const first = await store.listKeys(); first.push("injected");
    expect(await store.listKeys()).toEqual(["a"]);
    await store.dispose();
  });

  it("ignores inherited Object.prototype listing options", async () => {
    const store = create(); await store.setValue("a", "v"); await store.setValue("b", "v");
    let inheritedReads = 0;
    let omitted: string[] | undefined; let explicitEmpty: string[] | undefined;
    const names = ["limit", "lower", "upper"] as const;
    try {
      for (const name of names) {
        Object.defineProperty(Object.prototype, name, {
          configurable: true,
          get() { inheritedReads++; throw new Error("inherited listing option was read"); },
        });
      }
      omitted = await store.listKeys();
      explicitEmpty = await store.listKeys({});
    } finally {
      for (const name of names) delete (Object.prototype as Record<string, unknown>)[name];
    }
    expect(omitted).toEqual(["a", "b"]);
    expect(explicitEmpty).toEqual(["a", "b"]);
    expect(inheritedReads).toBe(0);
    await store.dispose();
  });

  it("never invokes serializers and rejects after disposal", async () => {
    const serialize = vi.fn((_: string, value: string) => value);
    const deserialize = vi.fn((_: string, value: string) => value);
    const store = create({ serialize, deserialize });
    await store.setValue("key", "v"); serialize.mockClear();
    expect(await store.listKeys()).toEqual(["key"]);
    expect(serialize).not.toHaveBeenCalled(); expect(deserialize).not.toHaveBeenCalled();
    await store.dispose();
    await expect(store.listKeys()).rejects.toMatchObject({ code: "unavailable" });
  });
});

it("disposal drains an in-flight key listing", async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let teardownCalls = 0;
  const store = createEnhancedValueStore({
    get: () => null, set: () => undefined, delete: () => undefined, writeBatch: () => undefined,
    clear: () => undefined, listKeys: async () => { await gate; return ["key"]; },
  }, undefined, { onStart() {}, onFinish() {}, dispose() { teardownCalls++; } });
  const listing = store.listKeys(); let disposed = false;
  const disposal = store.dispose().then(() => { disposed = true; });
  await Promise.resolve(); await Promise.resolve();
  expect(disposed).toBe(false); expect(teardownCalls).toBe(0);
  release(); expect(await listing).toEqual(["key"]); await disposal;
  expect(disposed).toBe(true); expect(teardownCalls).toBe(1);
});

it("validates optional listKeys capability and backend return shapes", async () => {
  const base = { get: () => null, set: () => undefined, delete: () => undefined, writeBatch: () => undefined };
  const absent = createEnhancedValueStore({ ...base, listKeys: undefined });
  expect("listKeys" in absent).toBe(false);
  expect(() => createEnhancedValueStore({ ...base, listKeys: "bad" as never })).toThrow(new ValueStoreError("unavailable"));
  const nonArray = createEnhancedValueStore({ ...base, listKeys: () => null as never });
  await expect(nonArray.listKeys()).rejects.toMatchObject({ code: "invalid-data" });
  const nonString = createEnhancedValueStore({ ...base, listKeys: () => ["ok", 42] as never });
  await expect(nonString.listKeys()).rejects.toMatchObject({ code: "invalid-data" });
  const sparse = createEnhancedValueStore({ ...base, listKeys: () => new Array(1) as never });
  await expect(sparse.listKeys()).rejects.toMatchObject({ code: "invalid-data" });
  const jsonPath = join(root(), "mixed-prefix.json");
  const all = createJsonFileValueStore({ filePath: jsonPath, prefix: "" });
  const scoped = createJsonFileValueStore({ filePath: jsonPath, prefix: "scope:" });
  await all.setValue("", "v"); await all.setValue("other:1", "v"); await all.setValue("scope:a", "v"); await all.setValue("zzz", "v");
  expect(await scoped.listKeys()).toEqual(["a"]);
  await scoped.dispose(); await all.dispose();
});

describe("ValueKeyLister adapter failures", () => {
  it("checks file state even when the result is empty", async () => {
    const path = join(root(), "missing.json"); const json = createJsonFileValueStore({ filePath: path, prefix: "" });
    expect(await json.listKeys()).toEqual([]); expect(existsSync(path)).toBe(false);
    await json.setValue("key", "v"); rmSync(path);
    await expect(json.listKeys({ limit: 0 })).rejects.toMatchObject({ code: "unavailable" }); await json.dispose();
    const sqlitePath = join(root(), "missing.sqlite"); const sqlite = createSqliteFileValueStore({ filePath: sqlitePath, prefix: "" });
    expect(await sqlite.listKeys()).toEqual([]); expect(existsSync(sqlitePath)).toBe(false);
    await sqlite.setValue("key", "v"); await new Promise(resolve => setTimeout(resolve, 1100)); rmSync(sqlitePath);
    await expect(sqlite.listKeys({ limit: 0 })).rejects.toMatchObject({ code: "unavailable" }); await sqlite.dispose().catch(() => undefined);
  });

  it("rejects corrupt file contents on empty results", async () => {
    const jsonPath = join(root(), "bad.json");
    const json = createJsonFileValueStore({ filePath: jsonPath, prefix: "" }); writeFileSync(jsonPath, "not json");
    await expect(json.listKeys({ limit: 0 })).rejects.toMatchObject({ code: "invalid-data" }); await json.dispose().catch(() => undefined);
    const sqlitePath = join(root(), "bad.sqlite"); writeFileSync(sqlitePath, "not sqlite");
    const sqlite = createSqliteFileValueStore({ filePath: sqlitePath, prefix: "" });
    await expect(sqlite.listKeys({ limit: 0 })).rejects.toMatchObject({ code: "invalid-data" });
    await expect(sqlite.listKeys({ lower: "z", upper: "a" })).rejects.toMatchObject({ code: "invalid-data" });
    await sqlite.dispose().catch(() => undefined);
  });

  it("surfaces unreadable JSON files even for a zero limit", async () => {
    const filePath = join(root(), "unreadable.json");
    const seeded = createJsonFileValueStore({ filePath, prefix: "" }); await seeded.setValue("key", "v");
    let opens = 0;
    const operations = {
      ...jsonFileOperations,
      open(path: string, flags: number, mode?: number) {
        opens++;
        if (opens === 2) throw Object.assign(new Error("private"), { code: "EACCES" });
        return jsonFileOperations.open(path, flags, mode);
      },
    };
    const unreadable = createJsonFileValueStoreWithOperations({ filePath, prefix: "" }, operations);
    await expect(unreadable.listKeys({ limit: 0 })).rejects.toMatchObject({ code: "access-denied" });
    await unreadable.dispose(); await seeded.dispose();
  });

  it.skipIf(process.platform === "win32" || (typeof process.getuid === "function" && process.getuid() === 0))("surfaces unreadable SQLite files even for an empty intersection", async () => {
    const filePath = join(root(), "unreadable.sqlite"); const store = createSqliteFileValueStore({ filePath, prefix: "" });
    await store.setValue("key", "v"); await new Promise(resolve => setTimeout(resolve, 1100)); chmodSync(filePath, 0);
    try {
      await expect(store.listKeys({ lower: "z", upper: "a" })).rejects.toMatchObject({ code: "operation-failed" });
    } finally {
      chmodSync(filePath, 0o600); await store.dispose().catch(() => undefined);
    }
  });

  it("rejects SQLite external transactions without ending them, including empty searches", async () => {
    const db = new DatabaseSync(":memory:"); databases.push(db); const store = createSqliteValueStore(db, { prefix: "" });
    await store.listKeys(); db.exec("BEGIN");
    await expect(store.listKeys({ limit: 0 })).rejects.toMatchObject({ code: "operation-failed" });
    await expect(store.listKeys({ lower: "z", upper: "a" })).rejects.toMatchObject({ code: "operation-failed" });
    expect(db.isTransaction).toBe(true); db.exec("ROLLBACK"); await store.dispose();
  });

  it("does not expose listing from web storage", async () => {
    const webStorage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
    const { createWebStorageValueStore } = await import("../src/web-storage.js");
    const store = createWebStorageValueStore(webStorage, { prefix: "" });
    expect("listKeys" in store).toBe(false);
    Object.defineProperty(Object.prototype, "listKeys", { value: "inherited", configurable: true, writable: true });
    try {
      const unaffected = createWebStorageValueStore(webStorage, { prefix: "" });
      expect(Object.hasOwn(unaffected, "listKeys")).toBe(false);
    } finally {
      delete (Object.prototype as Record<string, unknown>).listKeys;
    }
  });
});
