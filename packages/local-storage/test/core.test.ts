import { describe, expect, it } from "vitest";
import type { LocalValueBackend } from "../src/contracts.js";
import { LocalStorageError, sanitiseLocalStorageError } from "../src/errors.js";
import { MemoryLocalValueStore } from "../src/memory.js";
import { createLocalValueReader, createLocalValueStore } from "../src/store.js";
import { runLocalValueStoreContract } from "./contract-cases.js";

runLocalValueStoreContract(() => new MemoryLocalValueStore());

describe("MemoryLocalValueStore", () => {
  it("keeps each instance isolated and stores no enumerable state", async () => {
    const first = new MemoryLocalValueStore();
    const second = new MemoryLocalValueStore();

    await first.setValue("key", "value");

    await expect(first.getValue("key")).resolves.toBe("value");
    await expect(second.getValue("key")).resolves.toBeNull();
    expect(Object.keys(first)).toEqual([]);
  });

  it("stores raw strings and lets each instance apply its own serializer", async () => {
    const first = new MemoryLocalValueStore({
      serializer: {
        serialize: (_key, value) => `first:${value}`,
        deserialize: (_key, value) => value.slice("first:".length),
      },
    });
    const second = new MemoryLocalValueStore();

    await first.setValue("key", "value");
    await expect(first.getValue("key")).resolves.toBe("value");
    await expect(second.getValue("key")).resolves.toBeNull();
  });
});

describe("createLocalValueStore", () => {
  it("applies one async transform and one backend operation using the logical key", async () => {
    const entries = new Map<string, string>();
    const calls: string[] = [];
    const backend: LocalValueBackend = {
      async get(key) {
        calls.push(`get:${key}`);
        return entries.get(key) ?? null;
      },
      async set(key, value) {
        calls.push(`set:${key}`);
        entries.set(key, value);
      },
      async delete(key) {
        calls.push(`delete:${key}`);
        entries.delete(key);
      },
    };
    const serializer = {
      async serialize(key: string, value: string) {
        calls.push(`serialize:${key}`);
        return `${key}:${value}`;
      },
      async deserialize(key: string, value: string) {
        calls.push(`deserialize:${key}`);
        const prefix = `${key}:`;
        if (!value.startsWith(prefix)) {
          throw new Error("private malformed value");
        }
        return value.slice(prefix.length);
      },
    };
    const store = createLocalValueStore(backend, { serializer });

    await store.setValue("key", "value");
    await expect(store.getValue("key")).resolves.toBe("value");
    await store.delete("key");

    expect(calls).toEqual([
      "serialize:key",
      "set:key",
      "get:key",
      "deserialize:key",
      "delete:key",
    ]);
  });

  it("snapshots objects before awaiting the serializer and reuses the value path", async () => {
    const entries = new Map<string, string>();
    const calls: string[] = [];
    const serializer = {
      serialize(_key: string, value: string) {
        calls.push("serialize");
        const snapshot = value;
        return Promise.resolve(`wire:${snapshot}`);
      },
      deserialize(_key: string, value: string) {
        calls.push("deserialize");
        return value.slice("wire:".length);
      },
    };
    const store = createLocalValueStore({
      get(key) {
        calls.push("get");
        return entries.get(key) ?? null;
      },
      set(key, value) {
        calls.push("set");
        entries.set(key, value);
      },
      delete(key) {
        calls.push("delete");
        entries.delete(key);
      },
    }, { serializer });
    const supplied = { text: "before", nested: [false, 0] };

    const writing = store.setObject("object", supplied);
    supplied.text = "after";
    supplied.nested[0] = true;
    await writing;

    await expect(store.getObject("object")).resolves.toEqual({ text: "before", nested: [false, 0] });
    expect(entries.get("object")).toBe('wire:{"text":"before","nested":[false,0]}');
    expect(calls).toEqual(["serialize", "set", "get", "deserialize"]);
  });

  it("preserves JSON null and falsy values while empty local strings delete", async () => {
    const entries = new Map<string, string>();
    let serializeCalls = 0;
    let deserializeCalls = 0;
    let writes = 0;
    let deletes = 0;
    const store = createLocalValueStore({
      get: (key) => entries.get(key) ?? null,
      set(key, value) {
        writes += 1;
        entries.set(key, value);
      },
      delete(key) {
        deletes += 1;
        entries.delete(key);
      },
    }, {
      serializer: {
        serialize(_key, value) {
          serializeCalls += 1;
          return `wire:${value}`;
        },
        deserialize(_key, value) {
          deserializeCalls += 1;
          return value.slice("wire:".length);
        },
      },
    });

    await store.setValue("empty", "present");
    await store.setValue("empty", "");
    await store.delete("absent");
    expect(serializeCalls).toBe(1);
    expect(deletes).toBe(2);
    expect(writes).toBe(1);
    await expect(store.getValue("missing")).resolves.toBeNull();
    expect(deserializeCalls).toBe(0);

    const objectValues = [null, false, 0, ""] as const;
    for (const [index, value] of objectValues.entries()) {
      await store.setObject(`object-${index}`, value);
      await expect(store.getObject(`object-${index}`)).resolves.toBe(value);
    }
    expect(serializeCalls).toBe(5);
    expect(deserializeCalls).toBe(4);
    expect(entries.get("object-0")).toBe("wire:null");

    entries.set("deserialised-empty", "wire:");
    await expect(store.getValue("deserialised-empty")).resolves.toBe("");
    expect(deserializeCalls).toBe(5);
  });

  it("treats only raw null as absence", async () => {
    const reader = createLocalValueReader({ get: () => "" });
    await expect(reader.getValue("externally-stored-empty")).resolves.toBe("");
  });

  it("validates keys and values before serializer or backend callbacks", async () => {
    let callbackCalls = 0;
    const store = createLocalValueStore({
      get() {
        callbackCalls += 1;
        return null;
      },
      set() {
        callbackCalls += 1;
      },
      delete() {
        callbackCalls += 1;
      },
    }, {
      serializer: {
        serialize() {
          callbackCalls += 1;
          return "wire";
        },
        deserialize() {
          callbackCalls += 1;
          return "value";
        },
      },
    });
    const untypedStore = store as unknown as {
      getValue(key: unknown): Promise<string | null>;
      setValue(key: unknown, value: unknown): Promise<void>;
      setObject(key: unknown, value: unknown): Promise<void>;
    };

    await expect(untypedStore.getValue(null)).rejects.toMatchObject({ code: "invalid-key" });
    await expect(untypedStore.setValue("key", 1)).rejects.toMatchObject({ code: "invalid-value" });
    await expect(untypedStore.setObject("key", undefined)).rejects.toMatchObject({ code: "invalid-value" });
    await expect(untypedStore.setValue(false, "value")).rejects.toMatchObject({ code: "invalid-key" });
    expect(callbackCalls).toBe(0);
  });

  it("rejects failed or invalid serialisation without writing plaintext", async () => {
    const writes: Array<[string, string]> = [];
    const backend = {
      get: () => null,
      set: (key: string, value: string) => { writes.push([key, value]); },
      delete: () => undefined,
    };
    const throwing = createLocalValueStore(backend, {
      serializer: {
        serialize() { throw new Error("private plaintext"); },
        deserialize(_key, value) { return value; },
      },
    });
    await expect(throwing.setValue("key", "secret")).rejects.toMatchObject({
      code: "operation-failed",
      message: "The local storage operation failed.",
    });
    expect(writes).toEqual([]);

    const emptyOutput = createLocalValueStore(backend, {
      serializer: {
        serialize: () => "",
        deserialize: (_key, value) => value,
      },
    });
    await expect(emptyOutput.setValue("key", "secret")).rejects.toMatchObject({ code: "invalid-value" });
    expect(writes).toEqual([]);
  });

  it("rejects failed or invalid deserialisation without returning stored text", async () => {
    const backend = { get: () => "wire:secret", set: () => undefined, delete: () => undefined };
    const throwing = createLocalValueStore(backend, {
      serializer: {
        serialize: (_key, value) => value,
        deserialize() { throw new Error("private ciphertext"); },
      },
    });
    await expect(throwing.getValue("key")).rejects.toMatchObject({
      code: "operation-failed",
      message: "The local storage operation failed.",
    });

    const invalid = createLocalValueStore(backend, {
      serializer: {
        serialize: (_key, value) => value,
        deserialize: () => false as unknown as string,
      },
    });
    await expect(invalid.getValue("key")).rejects.toMatchObject({ code: "invalid-data" });
  });

  it("captures backend and serializer methods once and preserves both receivers", async () => {
    const reads = { get: 0, set: 0, delete: 0, serialize: 0, deserialize: 0, option: 0 };
    const backend = {
      marker: "backend",
      get get() {
        reads.get += 1;
        return function (this: { marker: string }, _key: string) {
          expect(this.marker).toBe("backend");
          return null;
        };
      },
      get set() {
        reads.set += 1;
        return function (this: { marker: string }, _key: string, _value: string) {
          expect(this.marker).toBe("backend");
        };
      },
      get delete() {
        reads.delete += 1;
        return function (this: { marker: string }, _key: string) {
          expect(this.marker).toBe("backend");
        };
      },
    };
    const serializer = {
      marker: "serializer",
      get serialize() {
        reads.serialize += 1;
        return function (this: { marker: string }, key: string, value: string) {
          expect(this.marker).toBe("serializer");
          return `${key}:${value}`;
        };
      },
      get deserialize() {
        reads.deserialize += 1;
        return function (this: { marker: string }, _key: string, value: string) {
          expect(this.marker).toBe("serializer");
          return value;
        };
      },
    };
    const options = {
      get serializer() {
        reads.option += 1;
        return serializer;
      },
    };
    const store = createLocalValueStore(backend, options);

    Object.defineProperty(backend, "get", {
      value: () => { throw new Error("replacement"); },
      configurable: true,
    });
    Object.defineProperty(serializer, "serialize", {
      value: () => { throw new Error("replacement"); },
      configurable: true,
    });
    await store.setValue("logical", "value");
    await store.getValue("logical");
    await store.delete("logical");

    expect(reads).toEqual({ get: 1, set: 1, delete: 1, serialize: 1, deserialize: 1, option: 1 });
  });

  it("rejects partial serializers and malformed raw backend results", async () => {
    expect(() => createLocalValueStore({
      get: () => null,
      set: () => undefined,
      delete: () => undefined,
    }, { serializer: { serialize: () => "wire" } as never })).toThrowError(LocalStorageError);

    for (const raw of [undefined, 1, false, {}]) {
      const store = createLocalValueReader({ get: () => raw as never });
      await expect(store.getValue("key")).rejects.toMatchObject({ code: "invalid-data" });
    }
  });

  it("parses object JSON only after one read and deserialisation", async () => {
    const calls: string[] = [];
    const reader = createLocalValueReader({
      get(key) {
        calls.push(`get:${key}`);
        return "wire:{\"value\":false}";
      },
    }, {
      serializer: {
        serialize: (_key, value) => value,
        deserialize(key, value) {
          calls.push(`deserialize:${key}`);
          return value.slice("wire:".length);
        },
      },
    });

    await expect(reader.getObject("logical")).resolves.toEqual({ value: false });
    expect(calls).toEqual(["get:logical", "deserialize:logical"]);
  });
});

describe("LocalStorageError", () => {
  it("uses fixed messages and safely maps an untrusted code", () => {
    const error = new (LocalStorageError as unknown as new (code: unknown) => LocalStorageError)(
      { toString: () => { throw new Error("secret"); } },
    );

    expect(error.code).toBe("operation-failed");
    expect(error.message).toBe("The local storage operation failed.");
    expect(error.message).not.toContain("secret");
  });

  it("reconstructs recognised errors without retaining their message", () => {
    const original = new LocalStorageError("invalid-key");
    original.message = "private key material";

    const sanitised = sanitiseLocalStorageError(original);

    expect(sanitised).not.toBe(original);
    expect(sanitised.code).toBe("invalid-key");
    expect(sanitised.message).toBe("The local storage key is invalid.");
  });

  it("maps recognised host names and hides all other errors", () => {
    expect(sanitiseLocalStorageError({ name: "SecurityError", message: "secret" }).code)
      .toBe("access-denied");
    expect(sanitiseLocalStorageError({ name: "QuotaExceededError", message: "secret" }).code)
      .toBe("quota-exceeded");
    expect(sanitiseLocalStorageError({ name: "TypeError", message: "secret" }).message)
      .toBe("The local storage operation failed.");
  });

  it("contains throwing name getters and hostile proxy prototype traps", () => {
    const getterError = Object.defineProperty({}, "name", {
      get() {
        throw new Error("private name");
      },
    });
    const prototypeError = new Proxy({}, {
      getPrototypeOf() {
        throw new Error("private prototype");
      },
    });

    expect(sanitiseLocalStorageError(getterError).code).toBe("operation-failed");
    expect(sanitiseLocalStorageError(prototypeError).message)
      .toBe("The local storage operation failed.");
  });
});
