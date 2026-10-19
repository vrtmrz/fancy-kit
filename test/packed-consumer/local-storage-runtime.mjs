import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalStorageError, MemoryLocalValueStore } from "@vrtmrz/local-storage";
import { createNodeLocalStore } from "@vrtmrz/local-storage/node";
import { createWebStorageLocalStore } from "@vrtmrz/local-storage/web-storage";
import { createCompatibleObsidianLocalStore, createObsidianLocalStore } from "@vrtmrz/obsidian-plugin-kit/local-storage";

const cases = [
  { key: "", value: "empty-key" },
  { key: "nul\u0000key", value: "left\u0000right" },
  { key: "bom\uFEFFkey", value: "\uFEFF" },
  { key: "high-\uD800", value: "\uD800" },
  { key: "low-\uDC00", value: "\uDC00" },
  { key: "pair-\uD83D\uDE03", value: "pair-\uD83D\uDE03" },
  { key: "composed-\u00E9", value: "e\u0301" },
];
function webStorage(entries) {
  return {
    getItem(key) { return entries.get(key) ?? null; },
    setItem(key, value) { entries.set(key, value); },
    removeItem(key) { entries.delete(key); },
  };
}
function officialStorage(entries) {
  return {
    loadLocalStorage(key) { return entries.get(key) ?? null; },
    saveLocalStorage(key, value) { if (value === null) entries.delete(key); else entries.set(key, value); },
  };
}
const serializer = {
  serialize: async (key, value) => JSON.stringify([key, value]),
  deserialize: async (key, value) => {
    const [storedKey, text] = JSON.parse(value);
    assert.equal(storedKey, key);
    return text;
  },
};
const temporaryRoot = await mkdtemp(join(tmpdir(), "packed-local-storage-"));
try {
  const filePath = join(temporaryRoot, "local-storage.json");
  const nodeStore = createNodeLocalStore({ filePath, prefix: "node/" });
  const otherPrefix = createNodeLocalStore({ filePath, prefix: "other/" });
  const webEntries = new Map();
  const storage = webStorage(webEntries);
  const directLegacy = createWebStorageLocalStore(storage, { prefix: "legacy/raw:" });
  const hostEntries = new Map();
  const host = officialStorage(hostEntries);
  const directOfficial = createObsidianLocalStore(host, { prefix: "official:" });
  let legacyCalls = 0;
  const compatibleLegacy = createCompatibleObsidianLocalStore(undefined, {
    prefix: "unused:",
    legacy() { legacyCalls++; return { storage, prefix: "compat/raw:" }; },
  });
  const compatibleOfficial = createCompatibleObsidianLocalStore(host, {
    prefix: "compatible-official:",
    get legacy() { throw new Error("The official selection must not inspect legacy storage"); },
  });
  const memory = new MemoryLocalValueStore();
  for (const store of [nodeStore, directLegacy, directOfficial, compatibleLegacy, compatibleOfficial, memory]) {
    assert.equal(await store.getValue("absent"), null);
    assert.equal(await store.getObject("absent"), undefined);
    assert.equal(await store.getValue("absent", ""), "");
    assert.deepEqual(await store.getObject("absent", { enabled: false }), { enabled: false });
    assert.equal(await store.getValue("absent"), null);
    for (const { key, value } of cases) {
      await store.setValue(key, value);
      assert.equal(await store.getValue(key), value);
    }
    for (const value of [null, "", 0, -0, false, {}, []]) {
      await store.setObject("object", value);
      assert.deepEqual(await store.getObject("object"), Object.is(value, -0) ? 0 : value);
      assert.deepEqual(await store.getObject("object", { fallback: true }), Object.is(value, -0) ? 0 : value);
    }
    const nested = { text: "", enabled: false, count: 0, empty: null, values: ["\uD800"] };
    await store.setObject("nested", nested);
    assert.deepEqual(await store.getObject("nested"), nested);
    await store.setValue("deleted", "present");
    await store.setValue("deleted", "");
    assert.equal(await store.getValue("deleted"), null);
    await assert.rejects(store.setValue("invalid", undefined), error => error instanceof LocalStorageError && error.code === "invalid-value");
    await store.delete("nested");
    assert.equal(await store.getObject("nested"), undefined);
  }
  assert.equal(legacyCalls, 1);
  assert.equal(webEntries.get("legacy/raw:nul\0key"), "left\0right");
  await otherPrefix.setValue("shared", "other-value");
  await nodeStore.setValue("shared", "node-value");
  assert.equal(await otherPrefix.getValue("shared"), "other-value");
  assert.equal(await createNodeLocalStore({ filePath, prefix: "node/" }).getValue("shared"), "node-value");
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import assert from "node:assert/strict";
    import { readFileSync } from "node:fs";
    import { createNodeLocalStore } from "@vrtmrz/local-storage/node";
    const { filePath, cases } = JSON.parse(readFileSync(0, "utf8"));
    const store = createNodeLocalStore({ filePath, prefix: "node/" });
    for (const { key, value } of cases) assert.equal(await store.getValue(key), value);
    assert.equal(await store.getValue("deleted"), null);
    assert.deepEqual(await store.getObject("object"), []);
    await store.setObject("child", { saved: true });
  `], { input: JSON.stringify({ filePath, cases }), encoding: "utf8" });
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(await nodeStore.getObject("child"), { saved: true });

  for (const store of [
    new MemoryLocalValueStore({ serializer }),
    createWebStorageLocalStore(storage, { prefix: "encoded-web:", serializer }),
    createObsidianLocalStore(host, { prefix: "encoded-host:", serializer }),
    createCompatibleObsidianLocalStore(undefined, { prefix: "unused:", serializer, legacy: () => ({ storage, prefix: "encoded-legacy:" }) }),
    createNodeLocalStore({ filePath, prefix: "encoded-node:", serializer }),
  ]) {
    await store.setObject("key", { enabled: false, empty: "", nil: null });
    assert.deepEqual(await store.getObject("key"), { enabled: false, empty: "", nil: null });
  }
  assert.equal(webEntries.get("encoded-web:key"), JSON.stringify(["key", JSON.stringify({ enabled: false, empty: "", nil: null })]));
  await directLegacy.setValue("copy", "source");
  for (const key of ["copy"]) {
    if (await directOfficial.getValue(key) !== null) continue;
    const value = await directLegacy.getValue(key);
    if (value !== null) await directOfficial.setValue(key, value);
  }
  assert.equal(await directLegacy.getValue("copy"), "source");
  assert.equal(await directOfficial.getValue("copy"), "source");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
