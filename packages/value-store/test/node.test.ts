import { afterEach, describe, expect, it, vi } from "vitest";
import { constants, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createJsonFileValueStore } from "../src/node/index.js";
import { createJsonFileValueStoreWithOperations } from "../src/node/files.js";
import { jsonFileOperations, type JsonFileOperations } from "../src/node/operations.js";
import { MAX_DOCUMENT_BYTES } from "../src/node/format.js";
import { ValueStoreError } from "../src/errors.js";
import { runValueStoreContract } from "./contract-cases.js";

const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "fancy-local-store-"));
  roots.push(root);
  return { root, filePath: join(root, "settings.json"), prefix: "plugin:" };
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function failure(code = "EIO") { return Object.assign(new Error("private-path-and-value"), { code }); }
async function expectCode(action: () => unknown, code: string) {
  let thrown: unknown;
  try { await action(); } catch (error) { thrown = error; }
  expect(thrown).toBeInstanceOf(ValueStoreError);
  expect(thrown).toMatchObject({ code });
  expect((thrown as Error).message).not.toContain("private");
  expect(thrown).not.toHaveProperty("cause");
}

runValueStoreContract(() => createJsonFileValueStore(fixture()));

describe("Node JSON-file value storage", async () => {
  it("does not create a file for construction, reads, or absent deletion", async () => {
    const options = fixture();
    const store = createJsonFileValueStore(options);
    expect(await store.getValue("missing")).toBeNull();
    await store.delete("missing");
    expect(readdirSync(options.root)).toEqual([]);
  });

  it("round-trips an empty string as data, including after reconstruction", async () => {
    const options = fixture();
    const store = createJsonFileValueStore(options);
    await store.setValue("empty", "");
    expect(await store.getValue("empty")).toBe("");
    expect(await createJsonFileValueStore(options).getValue("empty")).toBe("");
    expect(JSON.parse(readFileSync(options.filePath, "utf8"))).toEqual({
      version: 1, entries: [["plugin:empty", ""]],
    });
  });

  it("preserves prefixes, arbitrary keys, other namespaces, and reconstruction", async () => {
    const options = fixture();
    const first = createJsonFileValueStore(options);
    const other = createJsonFileValueStore({ ...options, prefix: "other:" });
    const raw = createJsonFileValueStore({ ...options, prefix: "" });
    await first.setValue("__proto__", "first");
    await other.setValue("__proto__", "second");
    expect(await raw.getValue("plugin:__proto__")).toBe("first");
    expect(await first.getValue("__proto__")).toBe("first");
    expect(await createJsonFileValueStore(options).getValue("__proto__")).toBe("first");
    await first.delete("__proto__");
    expect(await other.getValue("__proto__")).toBe("second");
    await other.delete("__proto__");
    expect(JSON.parse(readFileSync(options.filePath, "utf8"))).toEqual({ version: 1, entries: [] });
    if (process.platform !== "win32") expect(statSync(options.filePath).mode & 0o777).toBe(0o600);
  });

  it.each(["method", "getter"] as const)("ignores inherited toJSON %ss when replacing the document", async (kind) => {
    const options = fixture();
    const store = createJsonFileValueStore(options);
    await store.setValue("existing", "keep");
    await store.setValue("removed", "remove");
    const originals = [Object.prototype, Array.prototype].map((prototype) => ({
      prototype, descriptor: Object.getOwnPropertyDescriptor(prototype, "toJSON"),
    }));
    let hookCalls = 0;
    const hook = () => { hookCalls += 1; return "rewritten"; };
    try {
      for (const { prototype } of originals) {
        Object.defineProperty(prototype, "toJSON", kind === "method"
          ? { configurable: true, value: hook }
          : { configurable: true, get: hook });
      }
      await store.setValue("added", "value");
      await store.delete("removed");
    } finally {
      for (const { prototype, descriptor } of originals) {
        if (descriptor === undefined) Reflect.deleteProperty(prototype, "toJSON");
        else Object.defineProperty(prototype, "toJSON", descriptor);
      }
    }
    expect(hookCalls).toBe(0);
    const reopened = createJsonFileValueStore(options);
    expect(await reopened.getValue("existing")).toBe("keep");
    expect(await reopened.getValue("added")).toBe("value");
    expect(await reopened.getValue("removed")).toBeNull();
    expect(JSON.parse(readFileSync(options.filePath, "utf8"))).toEqual({
      version: 1, entries: [["plugin:existing", "keep"], ["plugin:added", "value"]],
    });
  });

  it("round-trips JSON objects with nested falsy values without retaining caller mutations", async () => {
    const options = fixture();
    const store = createJsonFileValueStore(options);
    const value = { text: "", count: 0, enabled: false, absent: null, items: ["\uD800", 2, {}] };
    await store.setObject("key", value);
    value.count = 9;
    const reopened = createJsonFileValueStore(options);
    const expected = { ...value, count: 0 };
    expect(await reopened.getObject("key")).toEqual(expected);
    ((await reopened.getObject("key")) as { count: number }).count = 42;
    expect(await reopened.getObject("key")).toEqual(expected);
  });

  it.each([null, "", 0, -0, false])("preserves top-level object value %j, including after restart", async (value) => {
    const options = fixture();
    const store = createJsonFileValueStore(options);
    await store.setValue("key", "before");
    await store.setObject("key", value);
    expect(await store.getObject("key")).toBe(Object.is(value, -0) ? 0 : value);
    expect(await createJsonFileValueStore(options).getObject("key")).toBe(Object.is(value, -0) ? 0 : value);
  });

  it("reads existing raw strings and interprets only explicitly requested object values", async () => {
    const options = fixture();
    writeFileSync(options.filePath, JSON.stringify({ version: 1, entries: [
      ["plugin:empty", ""], ["plugin:number", "0"], ["plugin:boolean", "false"], ["plugin:text", "Alice"],
    ] }));
    const store = createJsonFileValueStore(options);
    expect(await store.getValue("empty")).toBe("");
    expect(await store.getValue("number")).toBe("0");
    expect(await store.getObject("number")).toBe(0);
    expect(await store.getObject("boolean")).toBe(false);
    expect(await store.getValue("text")).toBe("Alice");
    await expectCode(() => store.getObject("text"), "invalid-data");
  });

  it("reads external replacements instead of retaining cached values", async () => {
    const options = fixture();
    const store = createJsonFileValueStore(options);
    await store.setValue("key", "before");
    writeFileSync(options.filePath, JSON.stringify({ version: 1, entries: [["plugin:key", "after"]] }));
    expect(await store.getValue("key")).toBe("after");
  });

  it("rejects invalid inputs before performing operation I/O", async () => {
    const options = fixture();
    const statDirectory = vi.fn(jsonFileOperations.statDirectory);
    const store = createJsonFileValueStoreWithOperations(options, { ...jsonFileOperations, statDirectory });
    statDirectory.mockClear();
    await expectCode(() => store.getValue(1 as never), "invalid-key");
    await expectCode(() => store.delete(null as never), "invalid-key");
    await expectCode(() => store.setValue("key", undefined as never), "invalid-value");
    expect(statDirectory).not.toHaveBeenCalled();
  });

  it.each(["", "bad\0path", null, 3])("rejects invalid path %j", async (filePath) => {
    await expectCode(() => createJsonFileValueStore({ filePath: filePath as string, prefix: "" }), "invalid-value");
  });

  it("requires an existing parent and detects its replacement", async () => {
    const options = fixture();
    await expectCode(() => createJsonFileValueStore({ ...options, filePath: join(options.root, "absent", "x.json") }), "unavailable");
    const parent = join(options.root, "parent");
    mkdirSync(parent);
    const store = createJsonFileValueStore({ ...options, filePath: join(parent, "settings.json") });
    renameSync(parent, join(options.root, "old"));
    mkdirSync(parent);
    await expectCode(() => store.setValue("key", "value"), "unavailable");
    expect(readdirSync(parent)).toEqual([]);
  });

  it("treats disappearance after a successful read as unavailable", async () => {
    const options = fixture();
    const store = createJsonFileValueStore(options);
    await store.setValue("key", "value");
    unlinkSync(options.filePath);
    await expectCode(() => store.getValue("key"), "unavailable");
    await expectCode(() => store.setValue("key", "replacement"), "unavailable");
    expect(existsSync(options.filePath)).toBe(false);
  });

  it.each([
    "", "not-json", "null", "[]", '{}', '{"version":2,"entries":[]}',
    '{"version":1,"entries":[],"extra":true}', '{"version":1,"entries":{}}',
    '{"version":1,"entries":[[1,"value"]]}',
    '{"version":1,"entries":[["key",null]]}',
    '{"version":1,"entries":[["key",false]]}',
    '{"version":1,"entries":[["key",0]]}',
    '{"version":1,"entries":[["key",{}]]}',

    '{"version":1,"entries":[["key","value","extra"]]}',
    '{"version":1,"entries":[["key","a"],["key","b"]]}',
    '\uFEFF{"version":1,"entries":[]}',
  ])("rejects malformed documents without modifying their bytes (%#)", async (document) => {
    const options = fixture();
    writeFileSync(options.filePath, document);
    await expectCode(() => createJsonFileValueStore(options), "invalid-data");
    expect(readFileSync(options.filePath, "utf8")).toBe(document);
  });

  it("rejects invalid UTF-8 and newly corrupted data without replacing it", async () => {
    const options = fixture();
    const store = createJsonFileValueStore(options);
    const bytes = Buffer.from([0xff, 0xfe]);
    writeFileSync(options.filePath, bytes);
    await expectCode(() => store.setValue("key", "value"), "invalid-data");
    expect(readFileSync(options.filePath)).toEqual(bytes);
  });

  it("enforces the inclusive complete-document byte limit before writing", async () => {
    const options = { ...fixture(), prefix: "" };
    const store = createJsonFileValueStore(options);
    const overhead = Buffer.byteLength(JSON.stringify({ version: 1, entries: [["key", ""]] }));
    const value = "x".repeat(MAX_DOCUMENT_BYTES - overhead);
    await store.setValue("key", value);
    expect(statSync(options.filePath).size).toBe(MAX_DOCUMENT_BYTES);
    expect(await createJsonFileValueStore(options).getValue("key")).toBe(value);
    await expectCode(() => store.setValue("key", `${value}x`), "quota-exceeded");
    await expectCode(() => store.setValue("key", "界".repeat(Math.ceil(MAX_DOCUMENT_BYTES / 3))), "quota-exceeded");
    expect(await store.getValue("key")).toBe(value);
    expect(readdirSync(options.root)).toEqual(["settings.json"]);
    writeFileSync(options.filePath, `${readFileSync(options.filePath, "utf8")} `);
    await expectCode(() => store.getValue("key"), "invalid-data");
  });

  it("rejects symbolic links, extra hard links, and directories", async () => {
    const options = fixture();
    const target = join(options.root, "target");
    writeFileSync(target, '{"version":1,"entries":[]}');
    symlinkSync(target, options.filePath);
    await expectCode(() => createJsonFileValueStore(options), "invalid-data");
    unlinkSync(options.filePath);
    linkSync(target, options.filePath);
    await expectCode(() => createJsonFileValueStore(options), "invalid-data");
    unlinkSync(options.filePath);
    mkdirSync(options.filePath);
    await expectCode(() => createJsonFileValueStore(options), "invalid-data");
  });

  it("handles short reads and writes, with bounded read buffers", async () => {
    const options = fixture();
    let largestRead = 0;
    const store = createJsonFileValueStoreWithOperations(options, {
      ...jsonFileOperations,
      read(fd, bytes, offset, length, position) {
        largestRead = Math.max(largestRead, bytes.length);
        return jsonFileOperations.read(fd, bytes, offset, Math.min(length, 3), position);
      },
      write: (fd, bytes, offset, length, position) => jsonFileOperations.write(fd, bytes, offset, Math.min(length, 2), position),
    });
    await store.setValue("key", "value");
    expect(await store.getValue("key")).toBe("value");
    expect(largestRead).toBe(statSync(options.filePath).size + 1);
  });

  it("rejects a file which grows while being read", async () => {
    const options = fixture();
    await createJsonFileValueStore(options).setValue("key", "value");
    let injected = false;
    const operations = {
      ...jsonFileOperations,
      read: ((...args) => {
        if (!injected) { injected = true; writeFileSync(options.filePath, `${readFileSync(options.filePath, "utf8")} `); }
        return jsonFileOperations.read(...args);
      }) as JsonFileOperations["read"],
    };
    await expectCode(() => createJsonFileValueStoreWithOperations(options, operations), "invalid-data");
  });
});

describe("Node replacement failures", async () => {
  it.each(["open", "write", "sync", "close", "rename"] as const)("preserves the old document and removes owned temporary files when %s fails", async (step) => {
    const options = fixture();
    await createJsonFileValueStore(options).setValue("key", "old");
    const before = readFileSync(options.filePath);
    const operations = { ...jsonFileOperations };
    let temporaryDescriptor: number | undefined;
    operations.open = (path, flags, mode) => {
      if ((flags & constants.O_CREAT) !== 0 && step === "open") throw failure();
      const descriptor = jsonFileOperations.open(path, flags, mode);
      if ((flags & constants.O_CREAT) !== 0) temporaryDescriptor = descriptor;
      return descriptor;
    };
    if (step === "write") operations.write = () => { throw failure(); };
    if (step === "sync") operations.sync = () => { throw failure(); };
    if (step === "close") operations.close = (fd) => { jsonFileOperations.close(fd); if (fd === temporaryDescriptor) throw failure(); };
    if (step === "rename") operations.rename = () => { throw failure("EACCES"); };
    const store = createJsonFileValueStoreWithOperations(options, operations);
    await expectCode(() => store.setValue("key", "new"), "operation-failed");
    expect(readFileSync(options.filePath)).toEqual(before);
    expect(readdirSync(options.root)).toEqual(["settings.json"]);
  });

  it.each([["EACCES", "access-denied"], ["EPERM", "access-denied"], ["ENOSPC", "quota-exceeded"], ["EDQUOT", "quota-exceeded"]])("sanitises %s before replacement", async (code, expected) => {
    const options = fixture();
    const store = createJsonFileValueStoreWithOperations(options, { ...jsonFileOperations, write: () => { throw failure(code); } });
    await expectCode(() => store.setValue("key", "value"), expected);
    expect(readdirSync(options.root)).toEqual([]);
  });

  it("reports an uncertain outcome if rename succeeds before throwing", async () => {
    const options = fixture();
    const store = createJsonFileValueStoreWithOperations(options, {
      ...jsonFileOperations,
      rename: (source, destination) => { renameSync(source, destination); throw failure("EACCES"); },
    });
    await expectCode(() => store.setValue("key", "new"), "operation-failed");
    expect(await createJsonFileValueStore(options).getValue("key")).toBe("new");
    expect(readdirSync(options.root)).toEqual(["settings.json"]);
  });

  it("keeps uncertain rename failures uncertain even if temporary cleanup is denied", async () => {
    const options = fixture();
    await createJsonFileValueStore(options).setValue("key", "old");
    const store = createJsonFileValueStoreWithOperations(options, {
      ...jsonFileOperations,
      rename: () => { throw failure("EACCES"); },
      unlink: () => { throw failure("EACCES"); },
    });
    await expectCode(() => store.setValue("key", "new"), "operation-failed");
    expect(await createJsonFileValueStore(options).getValue("key")).toBe("old");
    expect(readdirSync(options.root)).toHaveLength(2);
  });

  it("preserves a foreign replacement at the temporary path", async () => {
    const options = fixture();
    let temporary = "";
    const store = createJsonFileValueStoreWithOperations(options, {
      ...jsonFileOperations,
      open: (path, flags, mode) => { if ((flags & constants.O_CREAT) !== 0) temporary = path; return jsonFileOperations.open(path, flags, mode); },
      sync: () => { renameSync(temporary, `${temporary}.owned`); writeFileSync(temporary, "foreign"); throw failure(); },
    });
    await expectCode(() => store.setValue("key", "new"), "operation-failed");
    expect(readFileSync(temporary, "utf8")).toBe("foreign");
    expect(existsSync(options.filePath)).toBe(false);
  });

  it("contains hostile thrown objects", async () => {
    const options = fixture();
    const error = new Proxy({}, { get: () => { throw failure(); }, getPrototypeOf: () => { throw failure(); } });
    const store = createJsonFileValueStoreWithOperations(options, { ...jsonFileOperations, write: () => { throw error; } });
    await expectCode(() => store.setValue("key", "value"), "operation-failed");
  });
});

describe("Node value serialisation", () => {
  it("transforms once at the raw string boundary and reconstructs object values", async () => {
    const options = fixture();
    let writes = 0;
    let reads = 0;
    const serializer = {
      async serialize(key: string, value: string) { writes++; return JSON.stringify([key, value]); },
      async deserialize(key: string, value: string) {
        reads++;
        const [storedKey, storedValue] = JSON.parse(value) as [string, string];
        if (storedKey !== key) throw failure();
        return storedValue;
      },
    };
    const store = createJsonFileValueStore({ ...options, serializer });
    const value = { empty: "", zero: 0, enabled: false, text: "\uD800" };
    await store.setObject("entry", value);
    const raw = createJsonFileValueStore(options);
    expect(await raw.getValue("entry")).toBe(JSON.stringify(["entry", JSON.stringify(value)]));
    expect(await createJsonFileValueStore({ ...options, serializer }).getObject("entry")).toEqual(value);
    expect(writes).toBe(1);
    expect(reads).toBe(1);
    await store.delete("entry");
    expect(await store.getValue("entry")).toBeNull();
    expect(writes).toBe(1);
    expect(reads).toBe(1);
  });

  it("performs no filesystem work before asynchronous serialisation completes", async () => {
    const options = fixture();
    let release!: () => void;
    let started!: () => void;
    const pendingTransform = new Promise<void>((resolve) => { release = resolve; });
    const transformStarted = new Promise<void>((resolve) => { started = resolve; });
    const statDirectory = vi.fn(jsonFileOperations.statDirectory);
    const store = createJsonFileValueStoreWithOperations({
      ...options,
      serializer: {
        async serialize(_key, value) { started(); await pendingTransform; return `encoded:${value}`; },
        deserialize: (_key, value) => value.slice("encoded:".length),
      },
    }, { ...jsonFileOperations, statDirectory });
    statDirectory.mockClear();
    const pendingWrite = store.setValue("entry", "logical-value");
    await transformStarted;
    expect(statDirectory).not.toHaveBeenCalled();
    expect(readdirSync(options.root)).toEqual([]);
    await createJsonFileValueStore({ ...options, prefix: "other:" }).setValue("entry", "other-value");
    release();
    await pendingWrite;
    expect(await store.getValue("entry")).toBe("logical-value");
    expect(await createJsonFileValueStore({ ...options, prefix: "other:" }).getValue("entry")).toBe("other-value");
  });

  it("preserves the file after failed serialisation and counts encoded bytes against the limit", async () => {
    const options = fixture();
    await createJsonFileValueStore(options).setValue("entry", "existing-value");
    const original = readFileSync(options.filePath);
    const write = vi.fn(jsonFileOperations.write);
    const failed = createJsonFileValueStoreWithOperations({
      ...options,
      serializer: { serialize: async () => { throw failure(); }, deserialize: (_key, value) => value },
    }, { ...jsonFileOperations, write });
    await expectCode(() => failed.setValue("entry", "private-input"), "operation-failed");
    expect(write).not.toHaveBeenCalled();
    const oversized = createJsonFileValueStore({
      ...options,
      serializer: { serialize: () => "x".repeat(MAX_DOCUMENT_BYTES), deserialize: (_key, value) => value },
    });
    await expectCode(() => oversized.setValue("entry", "small-input"), "quota-exceeded");
    expect(readFileSync(options.filePath)).toEqual(original);
    expect(readdirSync(options.root)).toEqual(["settings.json"]);
  });
});
