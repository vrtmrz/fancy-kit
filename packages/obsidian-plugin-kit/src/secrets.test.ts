import { describe, expect, it, vi } from "vitest";
import { ValueStoreError } from "@vrtmrz/value-store";
import type { ObjectValue, ValueSerializer } from "@vrtmrz/value-store";
import type { SecretStoreOptions } from "@vrtmrz/secret-store";
import { createObsidianSecretStore } from "./secrets.js";
import type { ObsidianSecretStorage } from "./secrets.js";
import { secretStoreContract } from "../../secret-store/test/contract-cases.js";

function host() {
  const values = new Map<string, string>();
  return {
    values,
    getSecret: vi.fn((name: string) => values.get(name) ?? null),
    setSecret: vi.fn((name: string, value: string) => { values.set(name, value); }),
  };
}

secretStoreContract(() => createObsidianSecretStore(host()));

describe("createObsidianSecretStore", () => {
  it.each([undefined, null, {}, { getSecret() {} }, { setSecret() {} }, {
    getSecret: "not-callable", setSecret() {},
  }])("rejects missing host methods at construction (case %#)", (storage) => {
    expect(() => createObsidianSecretStore(storage as ObsidianSecretStorage)).toThrow(ValueStoreError);
    expect(() => createObsidianSecretStore(storage as ObsidianSecretStorage)).toThrow(
      expect.objectContaining({ code: "unavailable" }),
    );
  });

  it("constructs without reading or writing secrets", () => {
    const storage = host();
    createObsidianSecretStore(storage);
    expect(storage.getSecret).not.toHaveBeenCalled();
    expect(storage.setSecret).not.toHaveBeenCalled();
  });

  it("preserves method receivers and calls the host exactly once per operation", async () => {
    const backing = {
      values: new Map<string, string>(),
      getSecret(name: string) {
        return this.values.get(name) ?? null;
      },
      setSecret(name: string, value: string) {
        this.values.set(name, value);
      },
    };
    let getReads = 0;
    let setReads = 0;
    const storage = {
      values: backing.values,
      get getSecret() {
        getReads += 1;
        return vi.fn(backing.getSecret);
      },
      get setSecret() {
        setReads += 1;
        return vi.fn(backing.setSecret);
      },
    };
    const store = createObsidianSecretStore(storage);

    expect(getReads).toBe(1);
    expect(setReads).toBe(1);
    await store.setValue("token", "placeholder");
    await expect(store.getValue("token")).resolves.toBe("placeholder");
    expect(storage.values.get("token")).toBe("placeholder");
    expect("delete" in store).toBe(false);
  });

  it("stores object values as JSON through the core facade", async () => {
    const storage = host();
    const store = createObsidianSecretStore(storage);
    const value: ObjectValue = {
      text: "lone surrogate \ud800 and pair \ud83d\ude03",
      values: [null, false, 0, "", { nested: [true, "日本語"] }],
    };

    await store.setObject("object-secret", value);
    expect(storage.setSecret).toHaveBeenCalledExactlyOnceWith(
      "object-secret",
      JSON.stringify(value),
    );
    await expect(store.getObject("object-secret")).resolves.toEqual(value);
    expect(storage.getSecret).toHaveBeenCalledExactlyOnceWith("object-secret");

    await store.setObject("json-null", null);
    expect(storage.values.get("json-null")).toBe("null");
    await expect(store.getObject("json-null")).resolves.toBeNull();
    await expect(store.getObject("absent-object")).resolves.toBeUndefined();
  });

  it("awaits each serializer operation once with the logical name and preserves its receiver", async () => {
    const storage = host();
    const serializer = {
      prefix: "encoded:",
      serialize: vi.fn(async function(this: { prefix: string }, name: string, value: string) {
        return `${this.prefix}${name}:${value}`;
      }),
      deserialize: vi.fn(async function(this: { prefix: string }, name: string, value: string) {
        const marker = `${this.prefix}${name}:`;
        if (!value.startsWith(marker)) throw new Error("serializer-secret-sentinel");
        return value.slice(marker.length);
      }),
    } satisfies ValueSerializer;
    const options: SecretStoreOptions = { serializer };
    const store = createObsidianSecretStore(storage, options);

    await store.setValue("value-key", "raw-value");
    expect(serializer.serialize).toHaveBeenCalledExactlyOnceWith("value-key", "raw-value");
    expect(storage.setSecret).toHaveBeenCalledExactlyOnceWith("value-key", "encoded:value-key:raw-value");
    await expect(store.getValue("value-key")).resolves.toBe("raw-value");
    expect(serializer.deserialize).toHaveBeenCalledExactlyOnceWith("value-key", "encoded:value-key:raw-value");

    const value: ObjectValue = { nested: [null, false, 0, ""] };
    await store.setObject("object-key", value);
    expect(serializer.serialize).toHaveBeenLastCalledWith("object-key", JSON.stringify(value));
    expect(storage.setSecret).toHaveBeenLastCalledWith(
      "object-key",
      `encoded:object-key:${JSON.stringify(value)}`,
    );
    await expect(store.getObject("object-key")).resolves.toEqual(value);
    expect(serializer.deserialize).toHaveBeenLastCalledWith(
      "object-key",
      `encoded:object-key:${JSON.stringify(value)}`,
    );
    expect(serializer.serialize).toHaveBeenCalledTimes(2);
    expect(serializer.deserialize).toHaveBeenCalledTimes(2);
    expect(storage.setSecret).toHaveBeenCalledTimes(2);
    expect(storage.getSecret).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed native payloads without passing them through as values", async () => {
    const storage = host();
    const store = createObsidianSecretStore(storage);
    storage.getSecret.mockReturnValue(undefined as unknown as string);

    await expect(store.getValue("token")).rejects.toMatchObject({ code: "invalid-data" });
    expect(storage.getSecret).toHaveBeenCalledExactlyOnceWith("token");
    expect(storage.setSecret).not.toHaveBeenCalled();
  });

  it("rejects invalid names and values before a native call", async () => {
    const storage = host();
    const store = createObsidianSecretStore(storage);

    await expect(store.getValue("INVALID")).rejects.toMatchObject({ code: "invalid-name" });
    await expect(store.setValue("../token", "value")).rejects.toMatchObject({ code: "invalid-name" });
    await expect(store.setObject("../token", { value: true })).rejects.toMatchObject({ code: "invalid-name" });
    await expect(store.setValue("token", "\ud800")).rejects.toMatchObject({ code: "invalid-value" });
    expect(storage.getSecret).not.toHaveBeenCalled();
    expect(storage.setSecret).not.toHaveBeenCalled();
  });

  it.each(["get", "set"] as const)("sanitises host %s exceptions without fallback or retries", async (operation) => {
    const storage = host();
    storage.getSecret.mockImplementation(() => { throw new Error("secret-sentinel"); });
    storage.setSecret.mockImplementation(() => { throw new Error("secret-sentinel"); });
    const store = createObsidianSecretStore(storage);
    const promise = operation === "get"
      ? store.getValue("token")
      : store.setValue("token", "synthetic-value");
    const error = await promise.catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(ValueStoreError);
    expect(error).toMatchObject({ code: "operation-failed" });
    expect(String(error)).not.toContain("secret-sentinel");
    expect(JSON.stringify(error)).not.toContain("secret-sentinel");
    expect((error as Error).stack).not.toContain("secret-sentinel");
    expect(Object.hasOwn(error as object, "cause")).toBe(false);
    expect(storage.getSecret).toHaveBeenCalledTimes(operation === "get" ? 1 : 0);
    expect(storage.setSecret).toHaveBeenCalledTimes(operation === "set" ? 1 : 0);
  });

  it("sanitises host property access failures at construction", () => {
    const storage = {
      get getSecret(): ObsidianSecretStorage["getSecret"] { throw new Error("secret-sentinel"); },
      setSecret() {},
    };
    let error: unknown;
    try { createObsidianSecretStore(storage); } catch (failure) { error = failure; }
    expect(error).toMatchObject({ code: "operation-failed" });
    expect(String(error)).not.toContain("secret-sentinel");
    expect(Object.hasOwn(error as object, "cause")).toBe(false);
  });
});
