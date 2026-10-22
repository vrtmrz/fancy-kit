import { ValueStoreError } from "@vrtmrz/value-store";
import type { ValueStoreErrorCode } from "@vrtmrz/value-store";
import { describe, expect, it, vi } from "vitest";
import { createSecretReader, createSecretStore, MemorySecretStore, validateSecretName } from "../src/index.js";
import type { ObjectValue, SecretBackend, SecretBackendReader, SecretStoreOptions, ValueSerializer } from "../src/index.js";
import { secretStoreContract } from "./contract-cases.js";

secretStoreContract(() => new MemorySecretStore());
secretStoreContract(() => createSecretStore(createMapBackend()));

function createMapBackend() {
  const values = new Map<string, string>();
  return {
    values,
    get(name: string): string | null {
      return values.get(name) ?? null;
    },
    set(name: string, value: string): void {
      values.set(name, value);
    },
  };
}

function capturedError(operation: () => unknown): unknown {
  try {
    operation();
  } catch (error) {
    return error;
  }
  return undefined;
}

function expectFixedError(error: unknown, code: ValueStoreErrorCode, message: string): void {
  expect(error).toBeInstanceOf(ValueStoreError);
  expect(error).toMatchObject({ name: "ValueStoreError", code, message });
  expect(Object.hasOwn(error as object, "cause")).toBe(false);
  expect(JSON.stringify(error)).not.toContain("private-sentinel");
  expect(String(error)).not.toContain("private-sentinel");
}

describe("MemorySecretStore", () => {
  it("keeps instances independent and does not expose entries as object properties", async () => {
    const first = new MemorySecretStore();
    const second = new MemorySecretStore();
    await first.setValue("api-token", "private-sentinel");
    await expect(second.getValue("api-token")).resolves.toBeNull();
    await second.setValue("api-token", "second");
    await expect(first.getValue("api-token")).resolves.toBe("private-sentinel");
    expect(JSON.stringify(first)).not.toContain("private-sentinel");
    expect(Object.values(first)).not.toContain("private-sentinel");
  });

  it("rejects untyped values without invoking their conversion methods or changing state", async () => {
    const toString = vi.fn(() => { throw new Error("private-sentinel"); });
    const store = new MemorySecretStore();
    await store.setValue("api-token", "original");
    for (const input of [null, undefined, 1, {}, { toString }, new String("value")]) {
      await expect(store.setValue("api-token", input as string)).rejects.toMatchObject({ code: "invalid-value" });
    }
    expect(toString).not.toHaveBeenCalled();
    await expect(store.getValue("api-token")).resolves.toBe("original");
  });

  it("does not include rejected inputs in errors", async () => {
    const store = new MemorySecretStore();
    for (const operation of [
      () => store.getValue("INVALID-private-sentinel"),
      () => store.setValue("INVALID-private-sentinel", "value-private-sentinel"),
      () => store.setValue("api-token", "value-private-sentinel\ud800"),
    ]) {
      const error: unknown = await operation().catch((failure: unknown) => failure);
      expect(error).toBeInstanceOf(ValueStoreError);
      expect(String(error)).not.toContain("private-sentinel");
      expect(JSON.stringify(error)).not.toContain("private-sentinel");
      expect((error as Error).stack).not.toContain("private-sentinel");
      expect(Object.hasOwn(error as object, "cause")).toBe(false);
    }
  });

  it("does not apply a backend-specific value size limit", async () => {
    const store = new MemorySecretStore();
    const value = "a".repeat(65537);
    await store.setValue("api-token", value);
    await expect(store.getValue("api-token")).resolves.toBe(value);
  });
});

describe("secret facade serialization", () => {
  it("serializes empty strings once and preserves backend and serializer receivers", async () => {
    const backend = {
      values: new Map<string, string>(),
      reads: 0,
      writes: 0,
      get(name: string): string | null {
        expect(this).toBe(backend);
        this.reads += 1;
        return this.values.get(name) ?? null;
      },
      set(name: string, value: string): void {
        expect(this).toBe(backend);
        this.writes += 1;
        this.values.set(name, value);
      },
    };
    const serializer = {
      prefix: "encoded:",
      serializations: 0,
      deserializations: 0,
      serialize(key: string, value: string): string {
        this.serializations += 1;
        return `${this.prefix}${key}:${value}`;
      },
      deserialize(key: string, value: string): string {
        this.deserializations += 1;
        const prefix = `${this.prefix}${key}:`;
        if (!value.startsWith(prefix)) {
          throw new ValueStoreError("invalid-data");
        }
        return value.slice(prefix.length);
      },
    };
    const store = createSecretStore(backend, { serializer });

    await store.setValue("api-token", "");
    expect(backend.values.get("api-token")).toBe("encoded:api-token:");
    await expect(store.getValue("api-token")).resolves.toBe("");
    expect(serializer.serializations).toBe(1);
    expect(serializer.deserializations).toBe(1);
    expect(backend.writes).toBe(1);
    expect(backend.reads).toBe(1);
  });

  it("transforms object JSON exactly once in each direction", async () => {
    const backend = createMapBackend();
    const serialize = vi.fn((_key: string, value: string) => `cipher:${value}`);
    const deserialize = vi.fn((_key: string, value: string) => value.slice("cipher:".length));
    const store = createSecretStore(backend, { serializer: { serialize, deserialize } });
    const value: ObjectValue = { false: false, nested: [0, "", null] };

    await store.setObject("api-token", value);
    expect(backend.values.get("api-token")).toBe('cipher:{"false":false,"nested":[0,"",null]}');
    expect(serialize).toHaveBeenCalledTimes(1);
    expect(deserialize).not.toHaveBeenCalled();
    await expect(store.getObject("api-token")).resolves.toEqual(value);
    expect(deserialize).toHaveBeenCalledTimes(1);
    expect(serialize).toHaveBeenCalledTimes(1);
  });

  it("serializes before writing and deserializes after reading", async () => {
    const sequence: string[] = [];
    const backend = {
      value: "",
      get() {
        sequence.push("backend:get");
        return this.value || null;
      },
      set(_name: string, value: string) {
        sequence.push("backend:set");
        this.value = value;
      },
    };
    const serializer: ValueSerializer = {
      serialize(_key, value) {
        sequence.push("serialize");
        return `encoded:${value}`;
      },
      deserialize(_key, value) {
        sequence.push("deserialize");
        return value.slice("encoded:".length);
      },
    };
    const store = createSecretStore(backend, { serializer });

    await store.setValue("api-token", "secret");
    await store.getValue("api-token");
    expect(sequence).toEqual(["serialize", "backend:set", "backend:get", "deserialize"]);
  });

  it("validates names and raw caller strings before callbacks or backend operations", async () => {
    const backend = createMapBackend();
    const serialize = vi.fn((_key: string, value: string) => value);
    const deserialize = vi.fn((_key: string, value: string) => value);
    const store = createSecretStore(backend, { serializer: { serialize, deserialize } });

    await expect(store.setValue("API-token", "valid")).rejects.toMatchObject({ code: "invalid-name" });
    await expect(store.setValue("api-token", "broken\ud800")).rejects.toMatchObject({ code: "invalid-value" });
    await expect(store.getValue("API-token")).rejects.toMatchObject({ code: "invalid-name" });
    expect(serialize).not.toHaveBeenCalled();
    expect(deserialize).not.toHaveBeenCalled();
    expect(backend.values.size).toBe(0);
  });

  it("does not write when serialization returns a malformed result", async () => {
    const backend = createMapBackend();
    const serializer = {
      serialize: vi.fn(() => "bad\ud800"),
      deserialize: vi.fn((_key: string, value: string) => value),
    };
    const store = createSecretStore(backend, { serializer });

    await expect(store.setValue("api-token", "logical-value")).rejects.toMatchObject({ code: "invalid-value" });
    expect(serializer.serialize).toHaveBeenCalledTimes(1);
    expect(backend.values.size).toBe(0);
  });

  it("validates serializer result types before writing or returning a value", async () => {
    const backend = createMapBackend();
    const serializer = {
      serialize: vi.fn(() => 123),
      deserialize: vi.fn(() => undefined),
    };
    const store = createSecretStore(backend, { serializer } as unknown as SecretStoreOptions);

    await expect(store.setValue("api-token", "logical-value")).rejects.toMatchObject({ code: "invalid-value" });
    expect(backend.values.size).toBe(0);
    backend.values.set("api-token", "encoded");
    await expect(store.getValue("api-token")).rejects.toMatchObject({ code: "invalid-data" });
    expect(serializer.deserialize).toHaveBeenCalledTimes(1);
  });

  it("sanitises failed serializers and returns no value after a failed decode", async () => {
    const backend = createMapBackend();
    backend.values.set("api-token", "ciphertext-private-sentinel");
    const serializer: ValueSerializer = {
      serialize() { throw new Error("serialize-private-sentinel"); },
      deserialize() { throw new Error("decode-private-sentinel"); },
    };
    const store = createSecretStore(backend, { serializer });

    const writeError: unknown = await store.setValue("another-token", "value").catch((error: unknown) => error);
    expectFixedError(writeError, "operation-failed", "The storage operation failed.");
    const readError: unknown = await store.getValue("api-token").catch((error: unknown) => error);
    expectFixedError(readError, "operation-failed", "The storage operation failed.");
  });

  it("preserves a known fixed callback error category without its original instance", async () => {
    const backend = createMapBackend();
    const original = new ValueStoreError("access-denied");
    const store = createSecretStore(backend, {
      serializer: {
        serialize() { throw original; },
        deserialize(_key, value) { return value; },
      },
    });
    const error: unknown = await store.setValue("api-token", "value").catch((failure: unknown) => failure);
    expectFixedError(error, "access-denied", "Access to the store was denied.");
    expect(error).not.toBe(original);
  });

  it("maps malformed stored backend values and malformed decoded strings to invalid-data", async () => {
    const options = {
      serializer: {
        serialize: (_key: string, value: string) => value,
        deserialize: (_key: string, _value: string) => "bad\ud800",
      },
    };
    const malformedBackend = createSecretStore({ get: () => 12, set: () => undefined } as unknown as SecretBackend, options);
    await expect(malformedBackend.getValue("api-token")).rejects.toMatchObject({ code: "invalid-data" });
    const invalidDecodeBackend = createSecretStore({ get: () => "encoded", set: () => undefined }, options);
    await expect(invalidDecodeBackend.getValue("api-token")).rejects.toMatchObject({ code: "invalid-data" });
  });

  it("does not call a deserializer for absent entries or when no serializer is configured", async () => {
    const backend = createMapBackend();
    const deserialize = vi.fn((_key: string, value: string) => value);
    const reader = createSecretReader(backend, { serializer: { serialize: (_key, value) => value, deserialize } });
    await expect(reader.getValue("missing-token")).resolves.toBeNull();
    await expect(reader.getObject("missing-token")).resolves.toBeUndefined();
    expect(deserialize).not.toHaveBeenCalled();

    const identityBackend = createMapBackend();
    const identity = createSecretStore(identityBackend);
    await identity.setValue("api-token", "raw");
    expect(identityBackend.values.get("api-token")).toBe("raw");
    await expect(identity.getValue("api-token")).resolves.toBe("raw");
  });

  it("captures methods and configuration once while preserving receivers", async () => {
    const values = new Map<string, string>();
    let getReads = 0;
    let setReads = 0;
    let optionReads = 0;
    let serializeReads = 0;
    let deserializeReads = 0;
    const backend = { marker: "backend" } as {
      marker: string;
      get: (name: string) => string | null;
      set: (name: string, value: string) => void;
    };
    Object.defineProperties(backend, {
      get: {
        get() {
          getReads += 1;
          return function (this: unknown, name: string) {
            expect(this).toBe(backend);
            return values.get(name) ?? null;
          };
        },
      },
      set: {
        get() {
          setReads += 1;
          return function (this: unknown, name: string, value: string) {
            expect(this).toBe(backend);
            values.set(name, value);
          };
        },
      },
    });
    const serializer = { marker: "serializer" } as {
      marker: string;
      serialize: (key: string, value: string) => string;
      deserialize: (key: string, value: string) => string;
    };
    Object.defineProperties(serializer, {
      serialize: {
        get() {
          serializeReads += 1;
          return function (this: unknown, key: string, value: string) {
            expect(this).toBe(serializer);
            return `${serializer.marker}:${key}:${value}`;
          };
        },
      },
      deserialize: {
        get() {
          deserializeReads += 1;
          return function (this: unknown, key: string, value: string) {
            expect(this).toBe(serializer);
            return value.slice(`${serializer.marker}:${key}:`.length);
          };
        },
      },
    });
    const options = Object.defineProperty({}, "serializer", {
      get() {
        optionReads += 1;
        return serializer;
      },
    }) as SecretStoreOptions;

    const store = createSecretStore(backend, options);
    expect([getReads, setReads, optionReads, serializeReads, deserializeReads]).toEqual([1, 1, 1, 1, 1]);
    expect(values.size).toBe(0);
    await store.setValue("api-token", "secret");
    await expect(store.getValue("api-token")).resolves.toBe("secret");
    expect([getReads, setReads, optionReads, serializeReads, deserializeReads]).toEqual([1, 1, 1, 1, 1]);
  });

  it("does not inspect a writer method when constructing a reader", async () => {
    let writesRead = 0;
    let reads = 0;
    const backend = {
      get() {
        reads += 1;
        return null;
      },
      get set() {
        writesRead += 1;
        throw new Error("writer should not be inspected");
      },
    } as unknown as SecretBackendReader;
    const reader = createSecretReader(backend);
    expect(writesRead).toBe(0);
    await expect(reader.getValue("api-token")).resolves.toBeNull();
    expect(reads).toBe(1);
    expect(writesRead).toBe(0);
  });

  it("sanitises hostile configuration getters and rejects partial serializer pairs", () => {
    const backend = createMapBackend();
    const privateError = new Error("configuration-private-sentinel");
    const hostileOptions = Object.defineProperty({}, "serializer", {
      get() { throw privateError; },
    }) as SecretStoreOptions;
    const optionsError = capturedError(() => createSecretStore(backend, hostileOptions));
    expectFixedError(optionsError, "operation-failed", "The storage operation failed.");

    const partialOptions = [
      { serializer: { serialize: (_key: string, value: string) => value } },
      { serializer: { deserialize: (_key: string, value: string) => value } },
      { serializer: null },
      { serializer: { serialize: 1, deserialize: (_key: string, value: string) => value } },
    ];
    for (const options of partialOptions) {
      const error = capturedError(() => createSecretStore(backend, options as unknown as SecretStoreOptions));
      expect(error).toBeInstanceOf(ValueStoreError);
      expect(error).toMatchObject({ code: "invalid-value", message: "The value is invalid or unsupported." });
    }
  });

  it("does not leak hostile thrown values or invoke hostile code getters", async () => {
    const backend = createMapBackend();
    const hostileCode = new ValueStoreError("unavailable");
    Object.defineProperty(hostileCode, "code", { get() { throw new Error("code-private-sentinel"); } });
    const store = createSecretStore(backend, {
      serializer: { serialize() { throw hostileCode; }, deserialize(_key, value) { return value; } },
    });
    const error: unknown = await store.setValue("api-token", "value").catch((failure: unknown) => failure);
    expectFixedError(error, "operation-failed", "The storage operation failed.");

    const hostilePrototype = new Proxy({}, {
      getPrototypeOf() { throw new Error("prototype-private-sentinel"); },
    });
    const proxyThrowingStore = createSecretStore(backend, {
      serializer: {
        serialize() { throw hostilePrototype; },
        deserialize(_key, value) { return value; },
      },
    });
    const proxyError: unknown = await proxyThrowingStore.setValue("api-token", "value")
      .catch((failure: unknown) => failure);
    expectFixedError(proxyError, "operation-failed", "The storage operation failed.");
  });

  it("uses identity conversion without I/O during read-only construction", async () => {
    const values = new Map<string, string>();
    let getCalls = 0;
    let setCalls = 0;
    const backend: SecretBackendReader = {
      get(name) {
        getCalls += 1;
        return values.get(name) ?? null;
      },
    };
    const reader = createSecretReader(backend);
    expect([getCalls, setCalls]).toEqual([0, 0]);
    values.set("api-token", "identity");
    await expect(reader.getValue("api-token")).resolves.toBe("identity");
    expect([getCalls, setCalls]).toEqual([1, 0]);
  });
});

describe("object values", () => {
  it("snapshots caller data before an asynchronous serializer can yield", async () => {
    const backend = createMapBackend();
    let serialized: string | undefined;
    let finishSerialization: ((value: string) => void) | undefined;
    const serializer: ValueSerializer = {
      serialize(_key, value) {
        serialized = value;
        return new Promise((resolve) => { finishSerialization = resolve; });
      },
      deserialize(_key, value) { return value; },
    };
    const store = createSecretStore(backend, { serializer });
    const value = { nested: { count: 1 }, list: ["before"] };
    const pending = store.setObject("api-token", value);

    expect(serialized).toBe('{"nested":{"count":1},"list":["before"]}');
    value.nested.count = 2;
    value.list[0] = "after";
    finishSerialization?.("ciphertext");
    await pending;
    expect(backend.values.get("api-token")).toBe("ciphertext");
  });

  it("rejects unsupported values without invoking getters, toJSON, serializers, or the backend", async () => {
    const backend = createMapBackend();
    const serialize = vi.fn((_key: string, value: string) => value);
    const deserialize = vi.fn((_key: string, value: string) => value);
    const store = createSecretStore(backend, { serializer: { serialize, deserialize } });
    const getter = vi.fn(() => "private-sentinel");
    const toJSON = vi.fn(() => "converted");
    const accessor = Object.defineProperty({}, "value", { enumerable: true, get: getter });
    const withToJSON = { toJSON };
    const cycle: { self?: unknown } = {};
    cycle.self = cycle;
    const symbolKey = { [Symbol("private")]: "value" };
    const hidden = Object.defineProperty({}, "hidden", { value: "value", enumerable: false });
    const invalid: unknown[] = [
      undefined,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      1n,
      Symbol("value"),
      () => "value",
      new Date(0),
      new (class Example { value = 1; })(),
      Object.create({ inherited: "value" }),
      accessor,
      withToJSON,
      new Array(1),
      Object.assign([1], { extra: 2 }),
      symbolKey,
      hidden,
      cycle,
      new Proxy({}, { ownKeys() { throw new Error("proxy-private-sentinel"); } }),
    ];

    for (const value of invalid) {
      await expect(store.setObject("api-token", value as ObjectValue)).rejects.toMatchObject({ code: "invalid-value" });
    }
    expect(getter).not.toHaveBeenCalled();
    expect(toJSON).not.toHaveBeenCalled();
    expect(serialize).not.toHaveBeenCalled();
    expect(deserialize).not.toHaveBeenCalled();
    expect(backend.values.size).toBe(0);
  });

  it("preserves JSON text containing escaped lone surrogates and normalises negative zero", async () => {
    const backend = createMapBackend();
    const store = createSecretStore(backend);
    const value: ObjectValue = { inner: "\ud800", negativeZero: -0 };
    await store.setObject("api-token", value);
    expect(backend.values.get("api-token")).toBe('{"inner":"\\ud800","negativeZero":0}');
    await expect(store.getObject("api-token")).resolves.toEqual({ inner: "\ud800", negativeZero: 0 });
  });

  it("does not invoke inherited toJSON methods while encoding snapshots", async () => {
    const backend = createMapBackend();
    const store = createSecretStore(backend);
    const objectToJSON = vi.fn(() => "converted-object");
    const arrayToJSON = vi.fn(() => "converted-array");
    const oldObjectToJSON = Object.getOwnPropertyDescriptor(Object.prototype, "toJSON");
    const oldArrayToJSON = Object.getOwnPropertyDescriptor(Array.prototype, "toJSON");
    Object.defineProperty(Object.prototype, "toJSON", { configurable: true, value: objectToJSON });
    Object.defineProperty(Array.prototype, "toJSON", { configurable: true, value: arrayToJSON });
    try {
      await store.setObject("api-token", { nested: ["value"] });
      expect(backend.values.get("api-token")).toBe('{"nested":["value"]}');
      expect(objectToJSON).not.toHaveBeenCalled();
      expect(arrayToJSON).not.toHaveBeenCalled();
    } finally {
      if (oldObjectToJSON === undefined) {
        delete (Object.prototype as { toJSON?: unknown }).toJSON;
      } else {
        Object.defineProperty(Object.prototype, "toJSON", oldObjectToJSON);
      }
      if (oldArrayToJSON === undefined) {
        delete (Array.prototype as { toJSON?: unknown }).toJSON;
      } else {
        Object.defineProperty(Array.prototype, "toJSON", oldArrayToJSON);
      }
    }
  });

  it("rejects malformed JSON from storage with a fixed invalid-data error", async () => {
    const backend = createMapBackend();
    backend.values.set("api-token", "{\"password\": ");
    const store = createSecretStore(backend);
    const error: unknown = await store.getObject("api-token").catch((failure: unknown) => failure);
    expectFixedError(error, "invalid-data", "The stored data is invalid.");
  });
});

describe("validateSecretName", () => {
  it.each(["a", "0", "api-token-2", "a".repeat(64), "con", "constructor", "tostring"])(
    "accepts a complete portable name (case %#)",
    (name) => expect(() => validateSecretName(name)).not.toThrow(),
  );

  it.each([
    "", "a".repeat(65), "a".repeat(128), "a".repeat(129), "Api", "-api", "api-", "api--token", "api_token",
    ".", "..", "../api", "a/b", "a\\b", "a:b", "%61", " api", "api ",
    "a\0", "a\n", "a\r", "a\r\n", "a\u2028", "a\u2029", "日本語", "ａ", "é",
    "fancy-sec://api-token",
  ])("rejects invalid input without echoing it (case %#)", (name) => {
    expect(() => validateSecretName(name)).toThrow(ValueStoreError);
    expect(() => validateSecretName(name)).toThrow("The secret name is invalid.");
  });

  it("rejects non-string inputs without coercing them", () => {
    const toString = vi.fn(() => { throw new Error("private-sentinel"); });
    for (const input of [null, undefined, 1, { toString }, ["api"], new String("api")]) {
      expect(() => validateSecretName(input as string)).toThrow(ValueStoreError);
    }
    expect(toString).not.toHaveBeenCalled();
  });
});

describe("ValueStoreError", () => {
  it.each<ValueStoreErrorCode>([
    "invalid-name", "invalid-value", "unavailable", "access-denied",
    "decryption-failed", "invalid-data", "operation-failed",
  ])("preserves the known category %s without accepting a raw cause", (code) => {
    const error = Reflect.construct(ValueStoreError, [code, { cause: new Error("private-sentinel") }]);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ValueStoreError);
    expect(error).toMatchObject({ name: "ValueStoreError", code });
    expect((error as Error).message).toEqual(expect.any(String));
    expect(Object.hasOwn(error, "cause")).toBe(false);
    expect(JSON.stringify(error)).not.toContain("private-sentinel");
  });

  it("maps invalid untyped codes to a fixed failure without coercion", () => {
    const toString = vi.fn(() => { throw new Error("private-sentinel"); });
    for (const code of ["private-sentinel", "__proto__", "constructor", null, { toString }]) {
      const error = new ValueStoreError(code as ValueStoreErrorCode);
      expect(error.code).toBe("operation-failed");
      expect(error.message).toBe("The storage operation failed.");
      expect(JSON.stringify(error)).not.toContain("private-sentinel");
    }
    expect(toString).not.toHaveBeenCalled();
  });
});
