import { afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync, existsSync, readdirSync, readFileSync, unlinkSync, renameSync, writeFileSync, symlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { createSqliteFileValueStore, createSqliteValueStore } from "../src/sqlite/index.js";
import { FileManager } from "../src/sqlite/manager.js";
import { encodeString } from "../src/sqlite/codec.js";
import { ValueStoreError } from "../src/errors.js";
import { runValueStoreContract } from "./contract-cases.js";

const roots: string[] = [];
const databases: DatabaseSync[] = [];
function database() { const db = new DatabaseSync(":memory:"); databases.push(db); return db; }
function fixture() { const root = mkdtempSync(join(tmpdir(), "kit-sqlite-")); roots.push(root); return { root, filePath: join(root, "state #?.sqlite"), prefix: "peer:" }; }
afterEach(() => {
  vi.useRealTimers();
  for (const db of databases.splice(0)) { try { db.close(); } catch { /* Already closed by its owner. */ } }
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
runValueStoreContract(() => createSqliteValueStore(database(), { prefix: "" }));

function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }

describe("SQLite value storage", () => {
  it("preserves exact strings, ordered conditions, namespace scope, and literal prefix aliases", async () => {
    const db = database();
    const a = createSqliteValueStore(db, { prefix: "a", namespace: "\ud800\0" });
    const alias = createSqliteValueStore(db, { prefix: "", namespace: "\ud800\0" });
    const other = createSqliteValueStore(db, { prefix: "a", namespace: "other" });
    const text = "\ud800\0\ufeff\udfff";
    await a.writeBatch([{ type: "setValue", key: "%_", value: text }, { type: "setValue", key: "%_", value: "skip", ifAbsent: true }, { type: "delete", key: "gone" }, { type: "setObject", key: "null", value: null }]);
    expect(await alias.getValue("a%_")).toBe(text);
    await other.setValue("%_", "keep");
    await a.clear();
    expect(await a.getValue("%_")).toBeNull();
    expect(await other.getValue("%_")).toBe("keep");
    await other.dispose(); await a.dispose(); await alias.dispose();
    expect(db.prepare("SELECT count(*) AS n FROM fancy_kit_values").get()?.n).toBe(1);
  });

  it("uses its own statement result settings on a host-configured connection", async () => {
    const db = new DatabaseSync(":memory:", { readBigInts: true, returnArrays: true }); databases.push(db);
    const store = createSqliteValueStore(db, { prefix: "" });
    await store.setValue("key", "value"); expect(await store.getValue("key")).toBe("value");
    await store.dispose();
    expect(db.prepare("SELECT 1 AS value").get()).toEqual([1n]);
  });

  it("clears an entire namespace with an empty prefix, including an empty key", async () => {
    const store = createSqliteValueStore(database(), { prefix: "" });
    await store.setValue("", "value"); await store.setValue("key", "value");
    await store.clear();
    expect(await store.getValue("")).toBeNull(); expect(await store.getValue("key")).toBeNull();
    await store.dispose();
  });

  it("rolls back every statement of a failed batch, then continues", async () => {
    const db = database(); const store = createSqliteValueStore(db, { prefix: "" });
    await store.setValue("before", "keep");
    db.exec("CREATE TRIGGER reject_bad BEFORE INSERT ON fancy_kit_values WHEN NEW.key = x'006200610064' BEGIN SELECT RAISE(ABORT, 'private'); END");
    await expect(store.writeBatch([{ type: "setValue", key: "first", value: "transient" }, { type: "setValue", key: "bad", value: "fail" }])).rejects.toMatchObject({ code: "operation-failed" });
    expect(await store.getValue("first")).toBeNull();
    expect(await store.getValue("before")).toBe("keep");
    await store.setValue("after", "works");
    await store.dispose();
  });

  it("rejects an external transaction for reads and writes without ending it", async () => {
    const db = database(); const store = createSqliteValueStore(db, { prefix: "" });
    await store.getValue("missing");
    db.exec("BEGIN");
    await expect(store.setValue("key", "value")).rejects.toMatchObject({ code: "operation-failed" });
    await expect(store.getValue("key")).rejects.toMatchObject({ code: "operation-failed" });
    await expect(store.writeBatch([])).rejects.toMatchObject({ code: "operation-failed" });
    expect(db.isTransaction).toBe(true); db.exec("ROLLBACK");
    await store.writeBatch([]);
    await store.setValue("key", "value"); await store.dispose();
    expect(db.prepare("SELECT count(*) AS n FROM fancy_kit_values").get()?.n).toBe(1);
  });

  it("shares its connection lock across stores without rejecting Kit's own batch", async () => {
    const db = database(); const a = createSqliteValueStore(db, { prefix: "" }); const b = createSqliteValueStore(db, { prefix: "" });
    await Promise.all([a.writeBatch([{ type: "setValue", key: "a", value: "1" }]), b.writeBatch([{ type: "setValue", key: "b", value: "2" }]), b.getValue("a")]);
    expect(await a.getValue("b")).toBe("2"); await Promise.all([a.dispose(), b.dispose()]);
  });

  it("rejects corrupt values and newer metadata without substituting defaults", async () => {
    const db = database(); const store = createSqliteValueStore(db, { prefix: "" }); await store.getValue("x");
    db.prepare("INSERT INTO fancy_kit_values VALUES (?, ?, ?)").run(encodeString(""), encodeString("x"), new Uint8Array([0]));
    await expect(store.getValue("x", "fallback")).rejects.toMatchObject({ code: "invalid-data" });
    db.exec("UPDATE fancy_kit_value_store_meta SET version = 999");
    const future = createSqliteValueStore(db, { prefix: "" });
    await expect(future.getValue("x")).rejects.toMatchObject({ code: "invalid-data" });
    await expect(future.dispose()).rejects.toMatchObject({ code: "invalid-data" }); await store.dispose();
  });

  it("does not initialise a borrowed database when construction rejects a serialiser", () => {
    const db = database();
    expect(() => createSqliteValueStore(db, { prefix: "", serializer: {} as never })).toThrow(ValueStoreError);
    expect(db.prepare("SELECT name FROM sqlite_schema").all()).toEqual([]);
  });

  it("drains a prepared write while hiding its value and stops new admission", async () => {
    const gate = deferred();
    const store = createSqliteValueStore(database(), { prefix: "", serializer: { serialize: async (_key, value) => { await gate.promise; return value; }, deserialize: (_key, value) => value } });
    const write = store.setValue("key", "queued");
    expect(await store.getValue("key")).toBeNull();
    let done = false; const dispose = store.dispose().then(() => { done = true; });
    await expect(store.setValue("late", "no")).rejects.toMatchObject({ code: "unavailable" });
    expect(done).toBe(false); gate.resolve(); await write; await dispose; expect(done).toBe(true);
  });

  it("does not create missing files for reads, no-op mutations, or failed preparation", async () => {
    const f = fixture(); const store = createSqliteFileValueStore(f);
    expect(await store.getValue("key")).toBeNull(); await store.delete("key"); await store.clear(); await store.writeBatch([]); await store.writeBatch([{ type: "delete", key: "key" }]);
    expect(readdirSync(f.root)).toEqual([]); await store.dispose();
    const failing = createSqliteFileValueStore({ ...f, serializer: { serialize() { throw new Error("private"); }, deserialize: (_key, value) => value } });
    await expect(failing.setValue("key", "x")).rejects.toMatchObject({ code: "operation-failed" });
    expect(existsSync(f.filePath)).toBe(false); await failing.dispose();
  });

  it("creates on first write and reopens after idle close with committed data", async () => {
    const f = fixture(); const a = createSqliteFileValueStore(f); const b = createSqliteFileValueStore(f);
    await a.setValue("key", "value");
    expect(existsSync(f.filePath + "-wal")).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(existsSync(f.filePath + "-wal")).toBe(false);
    expect(await b.getValue("key")).toBe("value");
    await a.dispose(); expect(await b.getValue("key")).toBe("value"); await b.dispose();
    const reopened = createSqliteFileValueStore(f); expect(await reopened.getValue("key")).toBe("value"); await reopened.dispose();
  });

  it("detects later file creation and refuses known disappearance", async () => {
    const f = fixture(); const missing = createSqliteFileValueStore(f); expect(await missing.getValue("key")).toBeNull();
    const db = new DatabaseSync(f.filePath); const seed = createSqliteValueStore(db, { prefix: f.prefix }); await seed.setValue("key", "external"); await seed.dispose(); db.close();
    expect(await missing.getValue("key")).toBe("external");
    unlinkSync(f.filePath);
    await expect(missing.getValue("key")).rejects.toMatchObject({ code: "unavailable" });
    await expect(missing.dispose()).rejects.toMatchObject({ code: "unavailable" });
    expect(existsSync(f.filePath)).toBe(false);
  });

  it("validates an existing database and completes startup close before data operations", async () => {
    const f = fixture(); const seed = createSqliteFileValueStore(f); await seed.setValue("key", "value"); await seed.dispose();
    const events: string[] = []; let closes = 0;
    const manager = new FileManager(f.filePath, "full", {
      open: path => {
        events.push("open"); const db = new DatabaseSync(pathToFileURL(path).href + "?mode=rw");
        const close = db.close.bind(db); db.close = () => { closes++; events.push("close"); close(); }; return db;
      }, schedule: () => ({ cancel() {} }),
    });
    const sub = manager.subscribe(undefined); manager.start();
    await manager.access(false, null, () => { events.push("data"); return null; }); manager.finish();
    expect(events).toEqual(["open", "close", "open", "data"]); await manager.dispose(sub); expect(closes).toBe(2);
  });

  it("does not let an old timer close work accepted on a new generation", async () => {
    const f = fixture(); const timers: (() => void)[] = []; let closes = 0;
    const manager = new FileManager(f.filePath, "full", {
      open: path => { const db = new DatabaseSync(pathToFileURL(path).href + "?mode=rw"); const close = db.close.bind(db); db.close = () => { closes++; close(); }; return db; },
      schedule: callback => { timers.push(callback); return { cancel() {} }; },
    });
    const sub = manager.subscribe(undefined); manager.start(); await manager.access(true, undefined, () => undefined); manager.finish();
    manager.start(); timers[0](); await manager.access(false, undefined, () => undefined); expect(closes).toBe(0); manager.finish();
    await manager.dispose(sub); expect(closes).toBe(1);
  });

  it("retains background close failures and contains failing error hooks", async () => {
    const f = fixture(); let timer!: () => void; const notified = vi.fn(() => { throw new Error("logging"); });
    const manager = new FileManager(f.filePath, "full", {
      open: path => { const db = new DatabaseSync(path); databases.push(db); const close = db.close.bind(db); db.close = () => { close(); throw new Error("private"); }; return db; },
      schedule: callback => { timer = callback; return { cancel() {} }; },
    });
    const sub = manager.subscribe(notified); manager.start(); await manager.access(true, undefined, () => undefined); manager.finish(); timer();
    // Serialise behind the failed close, rather than relying on timer wall-clock timing.
    await expect(manager.access(false, undefined, () => undefined)).rejects.toMatchObject({ code: "operation-failed" });
    await expect(manager.dispose(sub)).rejects.toMatchObject({ code: "operation-failed" }); expect(notified).toHaveBeenCalledOnce();
  });

  it.each(["before", "after"] as const)("faults a connection after a COMMIT error reported %s native completion", async timing => {
    const db = database(); const store = createSqliteValueStore(db, { prefix: "" }); await store.getValue("key");
    const exec = db.exec.bind(db);
    db.exec = sql => {
      if (sql === "COMMIT" && timing === "before") throw new Error("commit rejected");
      exec(sql);
      if (sql === "COMMIT") throw new Error("uncertain commit");
    };
    await expect(store.setValue("key", "committed")).rejects.toMatchObject({ code: "operation-failed" });
    expect(db.prepare("SELECT count(*) AS n FROM fancy_kit_values").get()?.n).toBe(timing === "before" ? 0 : 1);
    expect(db.isTransaction).toBe(false);
    await expect(store.getValue("key")).rejects.toMatchObject({ code: "operation-failed" });
    await expect(store.dispose()).rejects.toMatchObject({ code: "operation-failed" }); db.exec = exec;
  });

  it("poisons a failed rollback and never exposes its uncommitted changes", async () => {
    const db = database(); const store = createSqliteValueStore(db, { prefix: "" }); await store.getValue("key");
    db.exec("CREATE TRIGGER reject_bad BEFORE INSERT ON fancy_kit_values WHEN NEW.key = x'006200610064' BEGIN SELECT RAISE(ABORT, 'private'); END");
    const exec = db.exec.bind(db); db.exec = sql => { if (sql === "ROLLBACK") throw new Error("rollback failure"); exec(sql); };
    await expect(store.writeBatch([{ type: "setValue", key: "first", value: "uncommitted" }, { type: "setValue", key: "bad", value: "fail" }])).rejects.toMatchObject({ code: "operation-failed" });
    expect(db.isTransaction).toBe(true);
    await expect(store.getValue("first")).rejects.toMatchObject({ code: "operation-failed" });
    await expect(store.dispose()).rejects.toMatchObject({ code: "operation-failed" }); db.exec = exec; exec("ROLLBACK");
  });

  it.each(["borrowed", "managed"] as const)("keeps a %s store usable after an independent busy writer releases", async ownership => {
    const f = fixture(); const seed = createSqliteFileValueStore(f); await seed.setValue("key", "seed"); await seed.dispose();
    const first = new DatabaseSync(f.filePath); databases.push(first);
    const second = ownership === "borrowed" ? new DatabaseSync(f.filePath) : undefined;
    if (second) databases.push(second);
    const store = second ? createSqliteValueStore(second, { prefix: f.prefix }) : createSqliteFileValueStore(f);
    await store.getValue("key");
    first.exec("BEGIN IMMEDIATE");
    await expect(store.setValue("key", "blocked")).rejects.toMatchObject({ code: "operation-failed" });
    expect(first.isTransaction).toBe(true); first.exec("ROLLBACK");
    expect(await store.getValue("key")).toBe("seed"); await store.setValue("key", "after");
    expect(await store.getValue("key")).toBe("after");
    await store.clear(); expect(await store.getValue("key")).toBeNull(); await store.dispose();
  });

  it("does not close another store's connection while its serialiser is pending", async () => {
    const f = fixture(); const gate = deferred();
    const first = createSqliteFileValueStore(f);
    const second = createSqliteFileValueStore({ ...f, serializer: { serialize: async (_key, value) => { await gate.promise; return value; }, deserialize: (_key, value) => value } });
    await first.setValue("key", "before"); const write = second.setValue("key", "after");
    await first.dispose(); expect(existsSync(f.filePath + "-wal")).toBe(true);
    gate.resolve(); await write; expect(await second.getValue("key")).toBe("after"); await second.dispose();
    expect(existsSync(f.filePath + "-wal")).toBe(false);
  });

  it("clears wildcard-looking prefixes literally without deleting same-namespace near matches", async () => {
    const db = database();
    const selected = createSqliteValueStore(db, { prefix: "%_\0\ud800" });
    const raw = createSqliteValueStore(db, { prefix: "" });
    await selected.setValue("key", "remove");
    await raw.setValue("%_\0\ud800nested", "remove-too");
    await raw.setValue("xy\0\ud800key", "keep");
    await raw.setValue("%_\0other", "keep-too");
    await selected.clear();
    expect(await selected.getValue("key")).toBeNull();
    expect(await raw.getValue("%_\0\ud800nested")).toBeNull();
    expect(await raw.getValue("xy\0\ud800key")).toBe("keep");
    expect(await raw.getValue("%_\0other")).toBe("keep-too");
    await Promise.all([selected.dispose(), raw.dispose()]);
  });

  it("rejects a replaced known database without adopting or modifying its contents", async () => {
    const f = fixture(); const store = createSqliteFileValueStore(f);
    await store.setValue("key", "original");
    // Replace only after normal idle close, so neither database has an active writer.
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(existsSync(f.filePath + "-wal")).toBe(false);
    const replacementPath = join(f.root, "replacement.sqlite");
    const replacementDb = new DatabaseSync(replacementPath);
    const replacement = createSqliteValueStore(replacementDb, { prefix: f.prefix });
    await replacement.setValue("key", "replacement"); await replacement.dispose(); replacementDb.close();
    const originalPath = join(f.root, "original.sqlite");
    renameSync(f.filePath, originalPath); renameSync(replacementPath, f.filePath);
    const replacementBytes = readFileSync(f.filePath);
    await expect(store.getValue("key")).rejects.toMatchObject({ code: "unavailable" });
    await expect(store.dispose()).rejects.toMatchObject({ code: "unavailable" });
    expect(readFileSync(f.filePath)).toEqual(replacementBytes);
    const originalDb = new DatabaseSync(originalPath); databases.push(originalDb);
    const original = createSqliteValueStore(originalDb, { prefix: f.prefix });
    expect(await original.getValue("key")).toBe("original"); await original.dispose();
  });

  it("rejects a changed parent identity and preserves the relocated database", async () => {
    const f = fixture(); const directory = join(f.root, "data"); mkdirSync(directory);
    const filePath = join(directory, "state.sqlite"); const store = createSqliteFileValueStore({ filePath, prefix: "" });
    await store.setValue("key", "original"); await new Promise(resolve => setTimeout(resolve, 1100));
    renameSync(directory, join(f.root, "retained")); mkdirSync(directory);
    writeFileSync(filePath, "unrelated replacement");
    await expect(store.getValue("key")).rejects.toMatchObject({ code: "unavailable" });
    await expect(store.dispose()).rejects.toMatchObject({ code: "unavailable" });
    expect(readFileSync(filePath, "utf8")).toBe("unrelated replacement");
    expect(existsSync(join(f.root, "retained", "state.sqlite"))).toBe(true);
  });

  it("preserves host tables, database metadata, and other namespaces when borrowing", async () => {
    const db = database();
    db.exec("CREATE TABLE host_data (value TEXT); INSERT INTO host_data VALUES ('keep'); PRAGMA user_version = 42; PRAGMA application_id = 1234");
    const store = createSqliteValueStore(db, { prefix: "" });
    const other = createSqliteValueStore(db, { prefix: "", namespace: "other" });
    await store.setValue("key", "clear"); await other.setValue("key", "keep");
    await store.clear(); expect(await store.getValue("key")).toBeNull(); expect(await other.getValue("key")).toBe("keep");
    await Promise.all([store.dispose(), other.dispose()]);
    expect(db.prepare("SELECT value FROM host_data").all()).toEqual([{ value: "keep" }]);
    expect(db.prepare("PRAGMA user_version").get()?.user_version).toBe(42);
    expect(db.prepare("PRAGMA application_id").get()?.application_id).toBe(1234);
  });

  it.each(["partial", "incompatible", "missing-version", "trigger"] as const)("rejects %s Kit schemas without changing host or reserved data", async kind => {
    const db = database(); db.exec("CREATE TABLE host_data (value TEXT); INSERT INTO host_data VALUES ('keep')");
    if (kind === "partial" || kind === "incompatible") {
      db.exec("CREATE TABLE fancy_kit_values (namespace BLOB, key BLOB, value BLOB)");
      if (kind === "incompatible") db.exec("CREATE TABLE fancy_kit_value_store_meta (id INTEGER, version INTEGER)");
    } else {
      const seed = createSqliteValueStore(db, { prefix: "" }); await seed.setValue("key", "keep"); await seed.dispose();
      if (kind === "missing-version") db.exec("DELETE FROM fancy_kit_value_store_meta");
      else db.exec("CREATE TRIGGER host_trigger AFTER INSERT ON fancy_kit_values BEGIN DELETE FROM host_data; END");
    }
    const before = db.prepare("SELECT type, name, sql FROM sqlite_schema ORDER BY name").all();
    const store = createSqliteValueStore(db, { prefix: "" });
    await expect(store.getValue("key", "default")).rejects.toMatchObject({ code: "invalid-data" });
    await expect(store.writeBatch([])).rejects.toMatchObject({ code: "invalid-data" });
    await expect(store.dispose()).rejects.toMatchObject({ code: "invalid-data" });
    expect(db.isTransaction).toBe(false);
    expect(db.prepare("SELECT type, name, sql FROM sqlite_schema ORDER BY name").all()).toEqual(before);
    expect(db.prepare("SELECT value FROM host_data").all()).toEqual([{ value: "keep" }]);
    if (kind === "trigger" || kind === "missing-version") expect(db.prepare("SELECT count(*) AS n FROM fancy_kit_values").get()?.n).toBe(1);
  });

  it("does not apply work after startup close fails, and reports the retained failure", async () => {
    const f = fixture(); const seed = createSqliteFileValueStore(f); await seed.setValue("key", "keep"); await seed.dispose();
    let opens = 0; let closes = 0; const notify = vi.fn(); const operation = vi.fn();
    const manager = new FileManager(f.filePath, "full", {
      open: path => { opens++; const db = new DatabaseSync(path); const close = db.close.bind(db); db.close = () => { closes++; close(); throw new Error("private-close"); }; return db; },
      schedule: () => { throw new Error("No idle timer is due during initialisation"); },
    });
    const sub = manager.subscribe(notify);
    await expect(manager.ready).rejects.toMatchObject({ code: "operation-failed" });
    await expect(manager.access(true, undefined, operation)).rejects.toMatchObject({ code: "operation-failed" });
    expect(() => manager.start()).toThrow(ValueStoreError);
    await expect(manager.dispose(sub)).rejects.toMatchObject({ code: "operation-failed" });
    expect(operation).not.toHaveBeenCalled(); expect(opens).toBe(1); expect(closes).toBe(1); expect(notify).toHaveBeenCalledOnce();
  });

  it("configures NORMAL only when explicitly selected", async () => {
    const f = fixture(); const store = createSqliteFileValueStore({ ...f, durability: "normal" });
    await store.setValue("key", "value"); expect(await store.getValue("key")).toBe("value"); await store.dispose();
  });

  it.each(["journal", "synchronous"] as const)("fails initialisation if native %s settings are not accepted", async setting => {
    const f = fixture(); let closes = 0;
    const manager = new FileManager(f.filePath, "full", {
      open: path => {
        const db = new DatabaseSync(path); const prepare = db.prepare.bind(db); const close = db.close.bind(db);
        db.close = () => { closes++; close(); };
        db.prepare = sql => {
          const statement = prepare(sql);
          if (setting === "journal" && sql === "PRAGMA journal_mode = WAL") statement.get = () => ({ journal_mode: "delete" });
          if (setting === "synchronous" && sql === "PRAGMA synchronous") statement.get = () => ({ synchronous: 0 });
          return statement;
        };
        return db;
      }, schedule: () => ({ cancel() {} }),
    });
    const sub = manager.subscribe(undefined); manager.start();
    await expect(manager.access(true, undefined, () => undefined)).rejects.toMatchObject({ code: "operation-failed" }); manager.finish();
    await expect(manager.dispose(sub)).rejects.toMatchObject({ code: "operation-failed" }); expect(closes).toBe(1);
  });

  it.each([
    { filePath: "" }, { filePath: "bad\0path" }, { filePath: 42 },
    { durability: "fast" }, { onBackgroundError: 42 }, { namespace: null },
  ])("rejects malformed construction options %j before creating files", invalid => {
    const f = fixture();
    expect(() => createSqliteFileValueStore({ ...f, ...invalid } as never)).toThrow(ValueStoreError);
    expect(readdirSync(f.root)).toEqual([]);
  });

  it("rejects unavailable borrowed capabilities without attempting schema I/O", () => {
    expect(() => createSqliteValueStore(null as never, { prefix: "" })).toThrow(ValueStoreError);
    expect(() => createSqliteValueStore({ prepare() {} } as never, { prefix: "" })).toThrow(ValueStoreError);
  });

  it("closes a managed poisoned connection once after all accepted work settles", async () => {
    const f = fixture(); let opened!: DatabaseSync; let closes = 0;
    const manager = new FileManager(f.filePath, "full", {
      open: path => { opened = new DatabaseSync(path); databases.push(opened); const close = opened.close.bind(opened); opened.close = () => { closes++; close(); }; return opened; },
      schedule: () => ({ cancel() {} }),
    });
    const sub = manager.subscribe(undefined); manager.start();
    await expect(manager.access(true, undefined, connection => {
      const exec = connection.database.exec.bind(connection.database);
      connection.database.exec = sql => { if (sql === "ROLLBACK") throw new Error("rollback failed"); exec(sql); };
      connection.transaction(() => {
        connection.database.exec("INSERT INTO fancy_kit_values VALUES (x'', x'006b', x'0076')");
        throw new Error("statement failed");
      });
    })).rejects.toMatchObject({ code: "operation-failed" });
    manager.finish();
    expect(opened.isTransaction).toBe(true);
    await expect(manager.access(false, null, () => "must not run")).rejects.toMatchObject({ code: "operation-failed" });
    await expect(manager.dispose(sub)).rejects.toMatchObject({ code: "operation-failed" });
    expect(opened.isOpen).toBe(false); expect(closes).toBe(1);
  });

  it("contains rejected notification hooks and skips subscriptions removed during notification", async () => {
    const f = fixture(); writeFileSync(f.filePath, "existing");
    const manager = new FileManager(f.filePath, "full", {
      open: () => { throw Object.assign(new Error("private"), { code: "EACCES" }); },
      schedule: () => ({ cancel() {} }),
    });
    const skipped = vi.fn(); const last = vi.fn();
    const first = manager.subscribe(() => { void manager.dispose(removed).catch(() => undefined); return Promise.reject(new Error("private-logging")); });
    const removed = manager.subscribe(skipped); const remaining = manager.subscribe(last);
    await expect(manager.ready).rejects.toMatchObject({ code: "access-denied" });
    await Promise.resolve();
    expect(skipped).not.toHaveBeenCalled(); expect(last).toHaveBeenCalledOnce();
    expect(last.mock.calls[0][0]).toMatchObject({ code: "access-denied" });
    await expect(manager.dispose(first)).rejects.toMatchObject({ code: "access-denied" });
    await expect(manager.dispose(remaining)).rejects.toMatchObject({ code: "access-denied" });
    expect(readFileSync(f.filePath, "utf8")).toBe("existing");
  });

  it("rechecks schema after another connection initialises it before the write lock", async () => {
    const templateDb = database(); const template = createSqliteValueStore(templateDb, { prefix: "" });
    await template.getValue("missing"); await template.dispose();
    const schema = templateDb.prepare("SELECT sql FROM sqlite_schema WHERE name IN ('fancy_kit_values', 'fancy_kit_value_store_meta') ORDER BY name").all().map(row => row.sql as string);
    const f = fixture(); const first = new DatabaseSync(f.filePath); const other = new DatabaseSync(f.filePath); databases.push(first, other);
    const exec = first.exec.bind(first); let interleaved = false;
    first.exec = sql => {
      if (sql === "BEGIN IMMEDIATE" && !interleaved) {
        interleaved = true;
        other.exec(schema.join(";")); other.exec("INSERT INTO fancy_kit_value_store_meta VALUES (1, 1)");
        other.prepare("INSERT INTO fancy_kit_values VALUES (?, ?, ?)").run(encodeString(""), encodeString("seed"), encodeString("other-connection"));
      }
      exec(sql);
    };
    const store = createSqliteValueStore(first, { prefix: "" });
    expect(await store.getValue("seed")).toBe("other-connection"); expect(interleaved).toBe(true);
    await store.setValue("key", "ours"); expect(await store.getValue("key")).toBe("ours"); await store.dispose();
  });

  it("rejects unrelated managed databases before changing their schema or journal policy", async () => {
    const f = fixture(); const db = new DatabaseSync(f.filePath);
    db.exec("CREATE TABLE host_data (value TEXT); INSERT INTO host_data VALUES ('keep'); PRAGMA user_version = 42; PRAGMA application_id = 1234");
    const journal = db.prepare("PRAGMA journal_mode").get()?.journal_mode; db.close();
    const before = readFileSync(f.filePath); const store = createSqliteFileValueStore(f);
    await expect(store.getValue("key", "default")).rejects.toMatchObject({ code: "invalid-data" });
    await expect(store.dispose()).rejects.toMatchObject({ code: "invalid-data" });
    expect(readFileSync(f.filePath)).toEqual(before);
    const retained = new DatabaseSync(f.filePath); databases.push(retained);
    expect(retained.prepare("SELECT value FROM host_data").all()).toEqual([{ value: "keep" }]);
    expect(retained.prepare("PRAGMA user_version").get()?.user_version).toBe(42);
    expect(retained.prepare("PRAGMA application_id").get()?.application_id).toBe(1234);
    expect(retained.prepare("PRAGMA journal_mode").get()?.journal_mode).toBe(journal);
  });

  it("persists ordinary managed deletion without invoking the serialiser", async () => {
    const f = fixture(); const serialize = vi.fn((_key: string, value: string) => value);
    const store = createSqliteFileValueStore({ ...f, serializer: { serialize, deserialize: (_key, value) => value } });
    await store.setValue("key", ""); expect(await store.getValue("key")).toBe(""); serialize.mockClear();
    await store.delete("key"); expect(await store.getValue("key")).toBeNull();
    await store.delete("key"); expect(serialize).not.toHaveBeenCalled(); await store.dispose();
    const reopened = createSqliteFileValueStore(f); expect(await reopened.getValue("key")).toBeNull(); await reopened.dispose();
  });

  it("rejects unknown formats, symlinks, and conflicting shared connection settings", async () => {
    const f = fixture(); writeFileSync(f.filePath, "not sqlite"); const broken = createSqliteFileValueStore(f);
    await expect(broken.getValue("key")).rejects.toMatchObject({ code: "invalid-data" }); await expect(broken.dispose()).rejects.toBeInstanceOf(ValueStoreError);
    const g = fixture(); const a = createSqliteFileValueStore(g);
    expect(() => createSqliteFileValueStore({ ...g, durability: "normal" })).toThrow(ValueStoreError); await a.dispose();
    const h = fixture(); const target = join(h.root, "target"); writeFileSync(target, "keep"); symlinkSync(target, h.filePath);
    const linked = createSqliteFileValueStore(h); await expect(linked.getValue("x")).rejects.toMatchObject({ code: "invalid-data" }); await expect(linked.dispose()).rejects.toBeInstanceOf(ValueStoreError);
  });
});
