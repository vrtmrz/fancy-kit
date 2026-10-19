import { describe, expect, it, vi } from "vitest";
import { createLocalValueStore, LocalStorageError, MemoryLocalValueStore } from "@vrtmrz/local-storage";
import { MemorySecretStore, SecretStoreError } from "@vrtmrz/secret-store";
import { createOwHkdfSerializer } from "../../examples/value-stores/ow-hkdf-serializer.js";

const passphrase = "synthetic-test-passphrase";
const makeSerializer = () => createOwHkdfSerializer(async () => passphrase);

describe("OW HKDF serializer example", () => {
  it("preserves arbitrary JavaScript strings through the UTF-8 encryption boundary", async () => {
    const serializer = makeSerializer();
    for (const value of ["", "\0", "\uFEFFtext", "\uD800", "\uDC00", "日本語🔐", "long\uD800".repeat(100)]) {
      const encoded = await serializer.serialize("key\uD800", value);
      expect(encoded.startsWith("%$")).toBe(true);
      expect(await serializer.deserialize("key\uD800", encoded)).toBe(value);
    }
  });

  it("uses fresh ciphertext for repeated values and carries its decryption salt", async () => {
    const serializer = makeSerializer();
    const first = await serializer.serialize("key", "value");
    const second = await serializer.serialize("key", "value");
    expect(first).not.toBe(second);
    expect(await makeSerializer().deserialize("key", first)).toBe("value");
  });

  it("rejects a different logical key and a wrong passphrase", async () => {
    const ciphertext = await makeSerializer().serialize("source-key", "private-value");
    await expect(makeSerializer().deserialize("other-key", ciphertext)).rejects.toThrow("could not be deserialised");
    await expect(createOwHkdfSerializer(() => "wrong-passphrase").deserialize("source-key", ciphertext)).rejects.toThrow("could not be deserialised");
  });

  it("rejects authenticated ciphertext damage without returning a partial value", async () => {
    const ciphertext = await makeSerializer().serialize("key", "private-value");
    const index = ciphertext.length - 8;
    const corrupted = ciphertext.slice(0, index) + (ciphertext[index] === "A" ? "B" : "A") + ciphertext.slice(index + 1);
    await expect(makeSerializer().deserialize("key", corrupted)).rejects.toThrow("could not be deserialised");
  });

  it.each(["plain-value", "%$not-base64!", "%$AAAA", `%$${"A".repeat(124)}!`])("rejects malformed input without logging it (%#)", async (ciphertext) => {
    const log = vi.spyOn(console, "log");
    const warn = vi.spyOn(console, "warn");
    const error = vi.spyOn(console, "error");
    try {
      await expect(makeSerializer().deserialize("key", ciphertext)).rejects.toThrow("could not be deserialised");
      expect(log).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      log.mockRestore(); warn.mockRestore(); error.mockRestore();
    }
  });

  it("replaces provider failures with a fixed error without a cause", async () => {
    const serializer = createOwHkdfSerializer(async () => { throw new Error("PRIVATE-KEY-SENTINEL"); });
    const error = await Promise.resolve().then(() => serializer.serialize("key", "PRIVATE-VALUE-SENTINEL")).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("The value could not be serialised.");
    expect(error).not.toHaveProperty("cause");
  });

  it.each(["", "\uD800", 123])("rejects invalid passphrases (%#)", async (value) => {
    const serializer = createOwHkdfSerializer(() => value as string);
    await expect(serializer.serialize("key", "value")).rejects.toThrow("could not be serialised");
  });

  it("stores only transformed strings in a local backend", async () => {
    const entries = new Map<string, string>();
    const serialize = vi.fn(makeSerializer().serialize);
    const deserialize = vi.fn(makeSerializer().deserialize);
    const store = createLocalValueStore({
      get: (key) => entries.get(key) ?? null,
      set: (key, value) => { entries.set(key, value); },
      delete: (key) => { entries.delete(key); },
    }, { serializer: { serialize, deserialize } });
    await store.setObject("entry", { value: "PRIVATE-VALUE", enabled: false, empty: "", zero: 0, nil: null });
    expect(entries.get("entry")).not.toContain("PRIVATE-VALUE");
    expect(await store.getObject("entry")).toEqual({ value: "PRIVATE-VALUE", enabled: false, empty: "", zero: 0, nil: null });
    expect(serialize).toHaveBeenCalledTimes(1);
    expect(deserialize).toHaveBeenCalledTimes(1);
    expect(await store.getObject("absent")).toBeUndefined();
    await store.setValue("entry", "");
    expect(entries.has("entry")).toBe(false);
    expect(serialize).toHaveBeenCalledTimes(1);
  });

  it("round-trips every top-level Object falsy value in both store families", async () => {
    const local = new MemoryLocalValueStore({ serializer: makeSerializer() });
    const secret = new MemorySecretStore({ serializer: makeSerializer() });
    for (const store of [local, secret]) {
      for (const value of [null, "", 0, false]) {
        await store.setObject("entry", value);
        expect(await store.getObject("entry")).toBe(value);
      }
    }
    await secret.setValue("entry", "");
    expect(await secret.getValue("entry")).toBe("");
  });

  it("reports failed decryption through each owning fixed error type", async () => {
    const entries = new Map<string, string>([["entry", "%$not-valid"]]);
    const local = createLocalValueStore({ get: (key) => entries.get(key) ?? null, set() {}, delete() {} }, { serializer: makeSerializer() });
    await expect(local.getValue("entry")).rejects.toBeInstanceOf(LocalStorageError);
    const secret = new MemorySecretStore({ serializer: {
      serialize: (_key, value) => value,
      deserialize: makeSerializer().deserialize,
    } });
    await secret.setValue("entry", "%$not-valid");
    await expect(secret.getValue("entry")).rejects.toBeInstanceOf(SecretStoreError);
    expect(entries.get("entry")).toBe("%$not-valid");
  });
});
