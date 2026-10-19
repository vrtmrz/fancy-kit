import { describe, expect, it, vi } from "vitest";
import { LocalStorageError } from "../src/errors.js";
import type { LocalValueStore } from "../src/contracts.js";
import {
  createWebStorageLocalStore,
  type WebStorageAccess,
} from "../src/web-storage.js";
import { runLocalValueStoreContract } from "./contract-cases.js";

function createMemoryWebStorage(): WebStorageAccess {
  const entries = new Map<string, string>();
  return {
    getItem(key) {
      return entries.get(key) ?? null;
    },
    setItem(key, value) {
      entries.set(key, value);
    },
    removeItem(key) {
      entries.delete(key);
    },
  };
}

runLocalValueStoreContract(
  () => createWebStorageLocalStore(createMemoryWebStorage(), { prefix: "" }),
);

describe("createWebStorageLocalStore", () => {
  it("does not access storage during construction and prefixes raw keys literally", async () => {
    const storage = {
      getItem: vi.fn((_key: string) => null),
      setItem: vi.fn((_key: string, _value: string) => undefined),
      removeItem: vi.fn((_key: string) => undefined),
    };
    const store = createWebStorageLocalStore(storage, { prefix: "p:/ " });

    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();

    await store.setValue("", "v");
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith("p:/ ", "v");
    await store.getValue("x%2F");
    expect(storage.getItem).toHaveBeenCalledTimes(1);
    expect(storage.getItem).toHaveBeenCalledWith("p:/ x%2F");
    await store.delete("x");
    expect(storage.removeItem).toHaveBeenCalledTimes(1);
    expect(storage.removeItem).toHaveBeenCalledWith("p:/ x");
  });

  it("passes the logical key to the serializer and stores its raw result under the prefix", async () => {
    const entries = new Map<string, string>();
    const calls: string[] = [];
    const storage = {
      getItem: vi.fn((key: string) => entries.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => { entries.set(key, value); }),
      removeItem: vi.fn((key: string) => { entries.delete(key); }),
    };
    const store = createWebStorageLocalStore(storage, {
      prefix: "physical:",
      serializer: {
        serialize(key, value) {
          calls.push(`serialize:${key}`);
          return `${key}:${value}`;
        },
        deserialize(key, value) {
          calls.push(`deserialize:${key}`);
          return value.slice(`${key}:`.length);
        },
      },
    });

    await store.setValue("logical", "value");
    await expect(store.getValue("logical")).resolves.toBe("value");

    expect(storage.setItem).toHaveBeenCalledOnce();
    expect(storage.setItem).toHaveBeenCalledWith("physical:logical", "logical:value");
    expect(storage.getItem).toHaveBeenCalledWith("physical:logical");
    expect(calls).toEqual(["serialize:logical", "deserialize:logical"]);
  });

  it("writes logical strings directly and JSON-encodes object values", async () => {
    const entries = new Map<string, string>();
    const storage = {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => { entries.set(key, value); },
      removeItem: (key: string) => { entries.delete(key); },
    };
    const store = createWebStorageLocalStore(storage, { prefix: "p:" });

    await store.setValue("raw", "0");
    expect(entries.get("p:raw")).toBe("0");
    await expect(store.getValue("raw")).resolves.toBe("0");

    await store.setObject("object", { text: "value", nested: [false, 0, "", null] });
    expect(entries.get("p:object")).toBe('{"text":"value","nested":[false,0,"",null]}');
    await expect(store.getObject("object")).resolves.toEqual({ text: "value", nested: [false, 0, "", null] });
  });

  it("captures methods and prefix once while preserving the storage receiver", async () => {
    const calls: string[] = [];
    const storage = {
      marker: "host",
      getItem(this: { marker: string }, key: string) {
        expect(this.marker).toBe("host");
        calls.push(`get:${key}`);
        return null;
      },
      setItem(this: { marker: string }, key: string, value: string) {
        expect(this.marker).toBe("host");
        calls.push(`set:${key}=${value}`);
      },
      removeItem(this: { marker: string }, key: string) {
        expect(this.marker).toBe("host");
        calls.push(`remove:${key}`);
      },
    };
    const options = { prefix: "before" };
    const store = createWebStorageLocalStore(storage, options);

    options.prefix = "after";
    Object.defineProperty(storage, "getItem", { value: () => { throw new Error("replacement"); } });
    await store.getValue("key");
    await store.setValue("key", "value");
    await store.delete("key");

    expect(calls).toEqual([
      "get:beforekey",
      "set:beforekey=value",
      "remove:beforekey",
    ]);
  });

  it("reads each storage method property once at construction", async () => {
    const reads = { getItem: 0, setItem: 0, removeItem: 0 };
    const storage = {
      get getItem() {
        reads.getItem += 1;
        return (_key: string) => null;
      },
      get setItem() {
        reads.setItem += 1;
        return (_key: string, _value: string) => undefined;
      },
      get removeItem() {
        reads.removeItem += 1;
        return (_key: string) => undefined;
      },
    };

    const store = createWebStorageLocalStore(storage, { prefix: "" });
    await store.getValue("key");
    await store.setValue("key", "value");
    await store.delete("key");

    expect(reads).toEqual({ getItem: 1, setItem: 1, removeItem: 1 });
  });

  it("validates inputs before invoking storage methods", async () => {
    const storage = {
      getItem: vi.fn((_key: string) => null),
      setItem: vi.fn((_key: string, _value: string) => undefined),
      removeItem: vi.fn((_key: string) => undefined),
    };
    const store = createWebStorageLocalStore(storage, { prefix: "" });
    const untypedStore = store as unknown as {
      getValue(key: unknown): Promise<string | null>;
      setValue(key: unknown, value: unknown): Promise<void>;
      delete(key: unknown): Promise<void>;
    };

    await expect(untypedStore.getValue(false)).rejects.toMatchObject({ code: "invalid-key" });
    await expect(untypedStore.setValue("key", undefined)).rejects.toMatchObject({ code: "invalid-value" });
    await expect(untypedStore.delete({})).rejects.toMatchObject({ code: "invalid-key" });
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("accepts an empty prefix and rejects a non-string prefix", () => {
    const storage = createMemoryWebStorage();
    expect(() => createWebStorageLocalStore(storage, { prefix: "" })).not.toThrow();

    expect(() => createWebStorageLocalStore(
      storage,
      { prefix: 2 as unknown as string },
    )).toThrowError(LocalStorageError);
  });

  it("rejects unavailable or incomplete storage without probing items", () => {
    expect(() => createWebStorageLocalStore(null, { prefix: "" }))
      .toThrowError(LocalStorageError);
    expect(() => createWebStorageLocalStore(undefined, { prefix: "" }))
      .toThrowError(LocalStorageError);
    expect(() => createWebStorageLocalStore(
      { getItem: () => null } as unknown as WebStorageAccess,
      { prefix: "" },
    )).toThrowError(LocalStorageError);
  });

  it("rejects malformed raw results and malformed object text as invalid data", async () => {
    for (const value of [undefined, 1, {}, false]) {
      const store = createWebStorageLocalStore(
        { ...createMemoryWebStorage(), getItem: () => value as string | null },
        { prefix: "" },
      );
      await expect(store.getValue("key")).rejects.toMatchObject({ code: "invalid-data" });
    }

    const store = createWebStorageLocalStore(
      { ...createMemoryWebStorage(), getItem: () => "not JSON" },
      { prefix: "" },
    );
    await expect(store.getValue("key")).resolves.toBe("not JSON");
    await expect(store.getObject("key")).rejects.toMatchObject({ code: "invalid-data" });
  });

  it("sanitises storage failures without returning absence or source details", async () => {
    const denied = new Error("private path") as Error & { name: string };
    denied.name = "SecurityError";
    const store = createWebStorageLocalStore(
      {
        ...createMemoryWebStorage(),
        getItem() {
          throw denied;
        },
      },
      { prefix: "" },
    );

    await expect(store.getValue("key")).rejects.toMatchObject({
      code: "access-denied",
      message: "Access to the local storage backend was denied.",
    });
  });

  it("satisfies the public store shape", () => {
    const storage = createMemoryWebStorage();
    const store: LocalValueStore = createWebStorageLocalStore(storage, { prefix: "" });
    expect(store).toHaveProperty("getValue");
    expect(store).toHaveProperty("setObject");
  });
});
