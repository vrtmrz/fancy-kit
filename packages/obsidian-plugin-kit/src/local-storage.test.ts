import { describe, expect, it, vi } from "vitest";
import { ValueStoreError } from "@vrtmrz/value-store";
import type { ObjectValue, ValueSerializer, ValueStoreOptions } from "@vrtmrz/value-store";
import { createWebStorageValueStore } from "@vrtmrz/value-store/web-storage";
import type { WebStorageAccess } from "@vrtmrz/value-store/web-storage";
import { runValueStoreContract } from "../../value-store/test/contract-cases.js";
import {
  createCompatibleObsidianLocalStore,
  createObsidianLocalStore,
} from "./local-storage.js";
import type {
  CompatibleObsidianLocalStoreOptions,
  LegacyLocalStoreSource,
  ObsidianLocalStorage,
} from "./local-storage.js";

function obsidianHost() {
  const values = new Map<string, string>();
  return {
    values,
    loadLocalStorage: vi.fn((key: string): string | null => values.get(key) ?? null),
    saveLocalStorage: vi.fn((key: string, value: string | null) => {
      if (value === null) values.delete(key);
      else values.set(key, value);
    }),
  };
}

function webHost() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  } satisfies WebStorageAccess & { values: Map<string, string> };
}

function source(storage: WebStorageAccess, prefix: string): LegacyLocalStoreSource {
  return { storage, prefix };
}

function serializer(prefix = "encoded:") {
  return {
    prefix,
    serialize: vi.fn(async function(this: { prefix: string }, key: string, value: string) {
      return `${this.prefix}${key}:${value}`;
    }),
    deserialize: vi.fn(async function(this: { prefix: string }, key: string, value: string) {
      const marker = `${this.prefix}${key}:`;
      if (!value.startsWith(marker)) throw new Error("serializer-sentinel");
      return value.slice(marker.length);
    }),
  } satisfies ValueSerializer & { prefix: string };
}

runValueStoreContract(() => createObsidianLocalStore(obsidianHost(), {
  prefix: "",
  serializer: serializer(),
}));

describe("createObsidianLocalStore", () => {
  it("passes value strings directly to App storage with a literal prefix", async () => {
    const storage = obsidianHost();
    const store = createObsidianLocalStore(storage, { prefix: "plugin::" });

    await store.setValue("token", "lone surrogate \ud800 and pair \ud83d\ude03");
    expect(storage.saveLocalStorage).toHaveBeenCalledExactlyOnceWith(
      "plugin::token",
      "lone surrogate \ud800 and pair \ud83d\ude03",
    );
    expect(storage.loadLocalStorage).not.toHaveBeenCalled();
    await expect(store.getValue("token")).resolves.toBe(
      "lone surrogate \ud800 and pair \ud83d\ude03",
    );
    expect(storage.loadLocalStorage).toHaveBeenCalledExactlyOnceWith("plugin::token");
    expect(storage.values.get("plugin::token")).toBe("lone surrogate \ud800 and pair \ud83d\ude03");
  });

  it("delegates object JSON conversion to the core facade", async () => {
    const storage = obsidianHost();
    const store = createObsidianLocalStore(storage, { prefix: "plugin::" });
    const value: ObjectValue = {
      text: "key-e\u0301, value-\uFEFF, lone \ud800",
      nested: [null, false, 0, "", { enabled: true, values: [1, "日本語"] }],
    };

    await store.setObject("record", value);
    expect(storage.saveLocalStorage).toHaveBeenCalledExactlyOnceWith(
      "plugin::record",
      JSON.stringify(value),
    );
    expect(storage.loadLocalStorage).not.toHaveBeenCalled();
    await expect(store.getObject("record")).resolves.toEqual(value);
    expect(storage.loadLocalStorage).toHaveBeenCalledExactlyOnceWith("plugin::record");

    await store.setObject("null-value", null);
    expect(storage.values.get("plugin::null-value")).toBe("null");
    await expect(store.getObject("null-value")).resolves.toBeNull();
    await expect(store.getObject("absent")).resolves.toBeUndefined();
  });

  it("deletes values explicitly and reads external empty strings", async () => {
    const storage = obsidianHost();
    const transform = serializer();
    const store = createObsidianLocalStore(storage, { prefix: "p/", serializer: transform });

    await store.setValue("empty", "present");
    await store.delete("empty");
    expect(storage.saveLocalStorage).toHaveBeenLastCalledWith("p/empty", null);
    expect(transform.serialize).toHaveBeenCalledExactlyOnceWith("empty", "present");
    expect(await store.getValue("empty")).toBeNull();
    expect(transform.deserialize).not.toHaveBeenCalled();

    storage.values.set("p/external-empty", "");
    const rawStore = createObsidianLocalStore(storage, { prefix: "p/" });
    await expect(rawStore.getValue("external-empty")).resolves.toBe("");
    expect(transform.deserialize).not.toHaveBeenCalled();

    await store.setValue("", "truthy-empty-key");
    expect(storage.saveLocalStorage).toHaveBeenLastCalledWith(
      "p/",
      "encoded::truthy-empty-key",
    );
    await expect(store.getValue("")).resolves.toBe("truthy-empty-key");
    expect(transform.serialize).toHaveBeenLastCalledWith("", "truthy-empty-key");
    expect(transform.deserialize).toHaveBeenCalledExactlyOnceWith(
      "",
      "encoded::truthy-empty-key",
    );
  });

  it.each([
    {
      key: "identity-empty",
      value: "",
      options: {},
    },
    {
      key: "serialized-empty",
      value: "ordinary-value",
      options: {
        serializer: {
          serialize: vi.fn(async () => ""),
          deserialize: vi.fn(async (_key: string, value: string) => value),
        } satisfies ValueSerializer,
      },
    },
  ] as const)(
    "rejects empty physical output before official or legacy writes (case %#)",
    async (testCase) => {
      const storage = obsidianHost();
      storage.values.set(`p/${testCase.key}`, "existing-value");
      const legacy = webHost();
      const provider = vi.fn(() => source(legacy, "legacy/"));
      const store = createCompatibleObsidianLocalStore(storage, {
        prefix: "p/",
        ...testCase.options,
        legacy: provider,
      });

      await expect(store.setValue(testCase.key, testCase.value)).rejects.toMatchObject({
        code: "invalid-value",
      });
      expect(storage.saveLocalStorage).not.toHaveBeenCalled();
      expect(storage.values.get(`p/${testCase.key}`)).toBe("existing-value");
      expect(provider).not.toHaveBeenCalled();
      expect(legacy.setItem).not.toHaveBeenCalled();
    },
  );

  it("allows an empty logical value when the serializer produces non-empty output", async () => {
    const storage = obsidianHost();
    const transform = serializer();
    const store = createObsidianLocalStore(storage, {
      prefix: "p/",
      serializer: transform,
    });

    await store.setValue("empty", "");

    expect(transform.serialize).toHaveBeenCalledExactlyOnceWith("empty", "");
    expect(storage.saveLocalStorage).toHaveBeenCalledExactlyOnceWith("p/empty", "encoded:empty:");
    await expect(store.getValue("empty")).resolves.toBe("");
  });

  it("awaits each serializer operation once with the logical key and raw string boundary", async () => {
    const storage = obsidianHost();
    const transform = serializer();
    const options: ValueStoreOptions = { serializer: transform };
    const store = createObsidianLocalStore(storage, { prefix: "physical::", ...options });

    await store.setValue("value-key", "raw-value");
    expect(transform.serialize).toHaveBeenCalledExactlyOnceWith("value-key", "raw-value");
    expect(storage.saveLocalStorage).toHaveBeenCalledExactlyOnceWith(
      "physical::value-key",
      "encoded:value-key:raw-value",
    );
    await expect(store.getValue("value-key")).resolves.toBe("raw-value");
    expect(transform.deserialize).toHaveBeenCalledExactlyOnceWith(
      "value-key",
      "encoded:value-key:raw-value",
    );

    const value: ObjectValue = { nested: [null, false, 0, ""] };
    await store.setObject("object-key", value);
    expect(transform.serialize).toHaveBeenLastCalledWith("object-key", JSON.stringify(value));
    expect(storage.saveLocalStorage).toHaveBeenLastCalledWith(
      "physical::object-key",
      `encoded:object-key:${JSON.stringify(value)}`,
    );
    await expect(store.getObject("object-key")).resolves.toEqual(value);
    expect(transform.deserialize).toHaveBeenLastCalledWith(
      "object-key",
      `encoded:object-key:${JSON.stringify(value)}`,
    );
    expect(transform.serialize).toHaveBeenCalledTimes(2);
    expect(transform.deserialize).toHaveBeenCalledTimes(2);
    expect(storage.saveLocalStorage).toHaveBeenCalledTimes(2);
    expect(storage.loadLocalStorage).toHaveBeenCalledTimes(2);
  });

  it("validates malformed raw values through the shared facade", async () => {
    const storage = obsidianHost();
    const store = createObsidianLocalStore(storage, { prefix: "p/" });
    storage.loadLocalStorage.mockReturnValue(7 as unknown as string);

    await expect(store.getValue("key")).rejects.toMatchObject({ code: "invalid-data" });
    expect(storage.loadLocalStorage).toHaveBeenCalledExactlyOnceWith("p/key");
    expect(storage.saveLocalStorage).not.toHaveBeenCalled();

    storage.loadLocalStorage.mockReturnValue("not-json");
    await expect(store.getObject("key")).rejects.toMatchObject({ code: "invalid-data" });
    expect(storage.loadLocalStorage).toHaveBeenCalledTimes(2);
  });

  it("preserves the App receiver and captures both host methods once", async () => {
    const backing = {
      values: new Map<string, string>(),
      loadLocalStorage(key: string) {
        return this.values.get(key) ?? null;
      },
      saveLocalStorage(key: string, value: string | null) {
        if (value === null) this.values.delete(key);
        else this.values.set(key, value);
      },
    };
    let loadReads = 0;
    let saveReads = 0;
    const storage = {
      values: backing.values,
      get loadLocalStorage() {
        loadReads += 1;
        return backing.loadLocalStorage;
      },
      get saveLocalStorage() {
        saveReads += 1;
        return backing.saveLocalStorage;
      },
    };

    const store = createObsidianLocalStore(storage, { prefix: "p/" });
    expect(loadReads).toBe(1);
    expect(saveReads).toBe(1);
    await store.setValue("key", "value");
    await expect(store.getValue("key")).resolves.toBe("value");
    expect(storage.values.get("p/key")).toBe("value");
  });

  it.each([undefined, null, {}, { loadLocalStorage() {} }, { saveLocalStorage() {} }, {
    loadLocalStorage: "not-callable", saveLocalStorage() {},
  }])("rejects absent or incomplete App methods at construction (case %#)", (storage) => {
    expect(() => createObsidianLocalStore(storage as unknown as ObsidianLocalStorage, { prefix: "p/" }))
      .toThrow(expect.objectContaining({ code: "unavailable" }));
  });

  it("rejects an invalid prefix before reading host methods", () => {
    const storage = {
      get loadLocalStorage(): ObsidianLocalStorage["loadLocalStorage"] {
        throw new Error("host-getter-sentinel");
      },
      saveLocalStorage() {},
    };
    expect(() => createObsidianLocalStore(storage, { prefix: 3 as unknown as string }))
      .toThrow(expect.objectContaining({ code: "invalid-value" }));
  });

  it("sanitises native failures without leaking host errors", async () => {
    const storage = obsidianHost();
    storage.loadLocalStorage.mockImplementation(() => { throw new Error("host-secret-sentinel"); });
    storage.saveLocalStorage.mockImplementation(() => { throw new Error("host-secret-sentinel"); });
    const store = createObsidianLocalStore(storage, { prefix: "p/" });

    const readError = await store.getValue("key").catch((failure: unknown) => failure);
    expect(readError).toBeInstanceOf(ValueStoreError);
    expect(readError).toMatchObject({ code: "operation-failed" });
    expect(String(readError)).not.toContain("host-secret-sentinel");
    expect(Object.hasOwn(readError as object, "cause")).toBe(false);

    const writeError = await store.setValue("key", "safe-value").catch((failure: unknown) => failure);
    expect(writeError).toMatchObject({ code: "operation-failed" });
    expect(String(writeError)).not.toContain("host-secret-sentinel");
    expect(storage.loadLocalStorage).toHaveBeenCalledTimes(1);
    expect(storage.saveLocalStorage).toHaveBeenCalledTimes(1);
  });
});

describe("createCompatibleObsidianLocalStore", () => {
  it("does not inspect the legacy option when the complete App API is available", async () => {
    const storage = obsidianHost();
    const options = {
      prefix: "official/",
      get legacy() {
        throw new Error("legacy-option-sentinel");
      },
    } as CompatibleObsidianLocalStoreOptions;

    const store = createCompatibleObsidianLocalStore(storage, options);
    await store.setValue("key", "raw-value");
    expect(storage.saveLocalStorage).toHaveBeenCalledExactlyOnceWith("official/key", "raw-value");
  });

  it("uses a lazy legacy Web Storage backend and passes the serializer through", async () => {
    const legacy = webHost();
    const transform = serializer("legacy:");
    const provider = vi.fn(() => source(legacy, "vault::plugin::"));
    const store = createCompatibleObsidianLocalStore(undefined, {
      prefix: "official/",
      serializer: transform,
      legacy: provider,
    });

    expect(provider).toHaveBeenCalledOnce();
    await store.setValue("token", "raw-value");
    expect(legacy.setItem).toHaveBeenCalledExactlyOnceWith(
      "vault::plugin::token",
      "legacy:token:raw-value",
    );
    await expect(store.getValue("token")).resolves.toBe("raw-value");
    expect(transform.serialize).toHaveBeenCalledExactlyOnceWith("token", "raw-value");
    expect(transform.deserialize).toHaveBeenCalledExactlyOnceWith("token", "legacy:token:raw-value");
    expect(legacy.getItem).toHaveBeenCalledExactlyOnceWith("vault::plugin::token");
  });

  it("stores and reads empty values in the explicitly selected legacy backend", async () => {
    const legacy = webHost();
    const provider = vi.fn(() => source(legacy, "vault::plugin::"));
    const store = createCompatibleObsidianLocalStore(undefined, {
      prefix: "official/",
      legacy: provider,
    });

    await store.setValue("empty", "");

    expect(provider).toHaveBeenCalledOnce();
    expect(legacy.setItem).toHaveBeenCalledExactlyOnceWith("vault::plugin::empty", "");
    expect(legacy.removeItem).not.toHaveBeenCalled();
    await expect(store.getValue("empty")).resolves.toBe("");
  });

  it.each([undefined, null, {}])(
    "uses the lazy provider only when both official methods are absent (case %#)", async (storage) => {
      const legacy = webHost();
      const provider = vi.fn(() => source(legacy, "vault::plugin::"));
      const store = createCompatibleObsidianLocalStore(storage, {
        prefix: "official/",
        legacy: provider,
      });

      await store.setObject("key", { nested: [true, 0, "", false] });
      await expect(store.getObject("key")).resolves.toEqual({ nested: [true, 0, "", false] });
      expect(provider).toHaveBeenCalledOnce();
      expect(legacy.setItem).toHaveBeenCalledExactlyOnceWith(
        "vault::plugin::key",
        JSON.stringify({ nested: [true, 0, "", false] }),
      );
      expect(legacy.getItem).toHaveBeenCalledExactlyOnceWith("vault::plugin::key");
    },
  );

  it.each([
    { loadLocalStorage() {} },
    { saveLocalStorage() {} },
    { loadLocalStorage: "not-callable", saveLocalStorage() {} },
    { loadLocalStorage() {}, saveLocalStorage: null },
  ])("rejects partial App APIs without legacy fallback (case %#)", (storage) => {
    const provider = vi.fn(() => source(webHost(), "legacy/"));

    expect(() => createCompatibleObsidianLocalStore(storage as unknown as Partial<ObsidianLocalStorage>, {
      prefix: "official/",
      legacy: provider,
    })).toThrow(expect.objectContaining({ code: "unavailable" }));
    expect(provider).not.toHaveBeenCalled();
  });

  it("does not fall back after official malformed data or operation errors", async () => {
    const storage = obsidianHost();
    const provider = vi.fn(() => source(webHost(), "legacy/"));
    const store = createCompatibleObsidianLocalStore(storage, {
      prefix: "official/",
      legacy: provider,
    });

    storage.loadLocalStorage.mockReturnValue("not-json");
    await expect(store.getObject("key")).rejects.toMatchObject({ code: "invalid-data" });
    storage.loadLocalStorage.mockImplementation(() => { throw new Error("host-sentinel"); });
    await expect(store.getValue("key")).rejects.toMatchObject({ code: "operation-failed" });
    expect(provider).not.toHaveBeenCalled();
  });

  it("copies a known string key explicitly and leaves the raw legacy source intact", async () => {
    const official = obsidianHost();
    const legacy = webHost();
    legacy.values.set("vault::plugin::token", "legacy-value");
    const currentStore = createObsidianLocalStore(official, { prefix: "official/" });
    const legacyStore = createWebStorageValueStore(legacy, { prefix: "vault::plugin::" });

    const current = await currentStore.getValue("token");
    if (current === null) {
      const old = await legacyStore.getValue("token");
      if (old !== null) await currentStore.setValue("token", old);
    }

    await expect(currentStore.getValue("token")).resolves.toBe("legacy-value");
    expect(official.loadLocalStorage).toHaveBeenCalledWith("official/token");
    expect(official.saveLocalStorage).toHaveBeenCalledWith("official/token", "legacy-value");
    expect(legacy.getItem).toHaveBeenCalledWith("vault::plugin::token");
    expect(legacy.values.get("vault::plugin::token")).toBe("legacy-value");
  });
});
