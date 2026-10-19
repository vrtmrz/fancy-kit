import { describe, expect, it } from "vitest";
import type { ValueBackend, ValueBackendDeleter } from "../src/contracts.js";
import { ValueStoreError, sanitiseValueStoreError } from "../src/errors.js";
import { MemoryValueStore } from "../src/memory.js";
import { createDeletableValueStore, createValueReader, createValueStore } from "../src/store.js";
import { runValueStoreContract } from "./contract-cases.js";

runValueStoreContract(() => new MemoryValueStore());

describe("MemoryValueStore", () => {
  it("keeps each instance isolated and stores no enumerable state", async () => {
    const first = new MemoryValueStore();
    const second = new MemoryValueStore();

    await first.setValue("key", "value");

    await expect(first.getValue("key")).resolves.toBe("value");
    await expect(second.getValue("key")).resolves.toBeNull();
    expect(Object.keys(first)).toEqual([]);
  });

  it("stores raw strings and lets each instance apply its own serializer", async () => {
    const first = new MemoryValueStore({
      serializer: {
        serialize: (_key, value) => `first:${value}`,
        deserialize: (_key, value) => value.slice("first:".length),
      },
    });
    const second = new MemoryValueStore();

    await first.setValue("key", "value");
    await expect(first.getValue("key")).resolves.toBe("value");
    await expect(second.getValue("key")).resolves.toBeNull();
  });
});

describe("value-store factories", () => {
  it("applies one async transform and one backend operation using the logical key", async () => {
    const entries = new Map<string, string>();
    const calls: string[] = [];
    const backend: ValueBackend & ValueBackendDeleter = {
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
    const store = createDeletableValueStore(backend, { serializer });

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
    const store = createValueStore({
      get(key) {
        calls.push("get");
        return entries.get(key) ?? null;
      },
      set(key, value) {
        calls.push("set");
        entries.set(key, value);
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

  it.each(["method", "getter"] as const)("ignores inherited toJSON %ss when encoding objects", async (kind) => {
    const store = new MemoryValueStore();
    const originals = [Object.prototype, Array.prototype].map((prototype) => ({
      prototype, descriptor: Object.getOwnPropertyDescriptor(prototype, "toJSON"),
    }));
    let hookCalls = 0;
    const hook = () => { hookCalls += 1; return "rewritten"; };
    let stored: string | null = null;
    try {
      for (const { prototype } of originals) {
        Object.defineProperty(prototype, "toJSON", kind === "method"
          ? { configurable: true, value: hook }
          : { configurable: true, get: hook });
      }
      await store.setObject("entry", { nested: ["original", { count: 0 }], empty: "" });
      stored = await store.getValue("entry");
    } finally {
      for (const { prototype, descriptor } of originals) {
        if (descriptor === undefined) Reflect.deleteProperty(prototype, "toJSON");
        else Object.defineProperty(prototype, "toJSON", descriptor);
      }
    }
    expect(stored).toBe('{"nested":["original",{"count":0}],"empty":""}');
    expect(hookCalls).toBe(0);
    const result = await store.getObject("entry") as { nested: unknown[] };
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(result.nested)).toBe(Array.prototype);
  });

  it("preserves empty strings and JSON falsy values while deletion is explicit", async () => {
    const entries = new Map<string, string>();
    let serializeCalls = 0;
    let deserializeCalls = 0;
    let writes = 0;
    let deletes = 0;
    const store = createDeletableValueStore({
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
    expect(serializeCalls).toBe(2);
    expect(deletes).toBe(1);
    expect(writes).toBe(2);
    await expect(store.getValue("empty")).resolves.toBe("");
    await expect(store.getValue("missing")).resolves.toBeNull();
    expect(deserializeCalls).toBe(1);

    const objectValues = [null, false, 0, ""] as const;
    for (const [index, value] of objectValues.entries()) {
      await store.setObject(`object-${index}`, value);
      await expect(store.getObject(`object-${index}`)).resolves.toBe(value);
    }
    expect(serializeCalls).toBe(6);
    expect(deserializeCalls).toBe(5);
    expect(entries.get("object-0")).toBe("wire:null");

    entries.set("deserialised-empty", "wire:");
    await expect(store.getValue("deserialised-empty")).resolves.toBe("");
    expect(deserializeCalls).toBe(6);
  });

  it("treats only raw null as absence", async () => {
    const reader = createValueReader({ get: () => "" });
    await expect(reader.getValue("externally-stored-empty")).resolves.toBe("");
  });

  it("validates keys and values before serializer or backend callbacks", async () => {
    let callbackCalls = 0;
    const store = createValueStore({
      get() {
        callbackCalls += 1;
        return null;
      },
      set() {
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
    const entries = new Map<string, string>();
    const backend = {
      get: (key: string) => entries.get(key) ?? null,
      set: (key: string, value: string) => { writes.push([key, value]); entries.set(key, value); },
    };
    const throwing = createValueStore(backend, {
      serializer: {
        serialize() { throw new Error("private plaintext"); },
        deserialize(_key, value) { return value; },
      },
    });
    await expect(throwing.setValue("key", "secret")).rejects.toMatchObject({
      code: "operation-failed",
      message: "The storage operation failed.",
    });
    expect(writes).toEqual([]);

    const emptyOutput = createValueStore(backend, {
      serializer: {
        serialize: () => "",
        deserialize: (_key, value) => value,
      },
    });
    await expect(emptyOutput.setValue("key", "secret")).resolves.toBeUndefined();
    expect(writes).toEqual([["key", ""]]);
    await expect(emptyOutput.getValue("key")).resolves.toBe("");
  });

  it("rejects failed or invalid deserialisation without returning stored text", async () => {
    const backend = { get: () => "wire:secret", set: () => undefined };
    const throwing = createValueStore(backend, {
      serializer: {
        serialize: (_key, value) => value,
        deserialize() { throw new Error("private ciphertext"); },
      },
    });
    await expect(throwing.getValue("key")).rejects.toMatchObject({
      code: "operation-failed",
      message: "The storage operation failed.",
    });

    const invalid = createValueStore(backend, {
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
    const store = createDeletableValueStore(backend, options);

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

  it("captures only get for a read-only facade", () => {
    const reads = { get: 0, set: 0, delete: 0 };
    const backend = {
      get get() {
        reads.get += 1;
        return (_key: string) => null;
      },
      get set() {
        reads.set += 1;
        return (_key: string, _value: string) => undefined;
      },
      get delete() {
        reads.delete += 1;
        return (_key: string) => undefined;
      },
    };

    createValueReader(backend);
    expect(reads).toEqual({ get: 1, set: 0, delete: 0 });
  });

  it("accepts only get and set and does not capture delete", async () => {
    const reads = { get: 0, set: 0, delete: 0 };
    const entries = new Map<string, string>();
    const backend = {
      get get() {
        reads.get += 1;
        return (key: string) => entries.get(key) ?? null;
      },
      get set() {
        reads.set += 1;
        return (key: string, value: string) => { entries.set(key, value); };
      },
      get delete() {
        reads.delete += 1;
        return (_key: string) => undefined;
      },
    };

    const store = createValueStore(backend);
    expect(reads).toEqual({ get: 1, set: 1, delete: 0 });
    await store.setValue("empty", "");
    expect(reads).toEqual({ get: 1, set: 1, delete: 0 });
    await expect(store.getValue("empty")).resolves.toBe("");
  });

  it("rejects partial serializers and malformed raw backend results", async () => {
    expect(() => createValueStore({
      get: () => null,
      set: () => undefined,
    }, { serializer: { serialize: () => "wire" } as never })).toThrowError(ValueStoreError);

    for (const raw of [undefined, 1, false, {}]) {
      const store = createValueReader({ get: () => raw as never });
      await expect(store.getValue("key")).rejects.toMatchObject({ code: "invalid-data" });
    }
  });

  it("parses object JSON only after one read and deserialisation", async () => {
    const calls: string[] = [];
    const reader = createValueReader({
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

describe("ValueStoreError", () => {
  it("uses fixed messages and safely maps an untrusted code", () => {
    const error = new (ValueStoreError as unknown as new (code: unknown) => ValueStoreError)(
      { toString: () => { throw new Error("secret"); } },
    );

    expect(error.code).toBe("operation-failed");
    expect(error.message).toBe("The storage operation failed.");
    expect(error.message).not.toContain("secret");
  });

  it("reconstructs recognised errors without retaining their message", () => {
    const original = new ValueStoreError("invalid-key");
    original.message = "private key material";

    const sanitised = sanitiseValueStoreError(original);

    expect(sanitised).not.toBe(original);
    expect(sanitised.code).toBe("invalid-key");
    expect(sanitised.message).toBe("The value store key is invalid.");
  });

  it("maps recognised host names and hides all other errors", () => {
    expect(sanitiseValueStoreError({ name: "SecurityError", message: "secret" }).code)
      .toBe("access-denied");
    expect(sanitiseValueStoreError({ name: "QuotaExceededError", message: "secret" }).code)
      .toBe("quota-exceeded");
    expect(sanitiseValueStoreError({ name: "TypeError", message: "secret" }).message)
      .toBe("The storage operation failed.");
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

    expect(sanitiseValueStoreError(getterError).code).toBe("operation-failed");
    expect(sanitiseValueStoreError(prototypeError).message)
      .toBe("The storage operation failed.");
  });
});
