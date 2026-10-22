import { describe, expect, it, vi } from "vitest";
import { createSecretReader, createSecretStore } from "../src/index.js";
import type { ObjectValue } from "../src/index.js";

describe.each([
  ["read-only", createSecretReader],
  ["writable", createSecretStore],
] as const)("getter defaults (%s)", (_label, createReader) => {
  it("returns absence defaults without transforms or writes", async () => {
    const get = vi.fn(() => null);
    const set = vi.fn();
    const serialize = vi.fn(() => { throw new Error("must not transform defaults"); });
    const deserialize = vi.fn(() => { throw new Error("must not transform defaults"); });
    const reader = createReader({ get, set }, { serializer: { serialize, deserialize } });

    await expect(reader.getValue("missing", "")).resolves.toBe("");
    await expect(reader.getObject("missing", false)).resolves.toBe(false);
    await expect(reader.getObject("missing", 0)).resolves.toBe(0);
    await expect(reader.getObject("missing", "")).resolves.toBe("");
    expect(get).toHaveBeenCalledTimes(4);
    expect(set).not.toHaveBeenCalled();
    expect(serialize).not.toHaveBeenCalled();
    expect(deserialize).not.toHaveBeenCalled();
  });

  it("keeps decoded empty strings and JSON null instead of applying defaults", async () => {
    const get = vi.fn((key: string) => key === "empty" ? "wire:" : "wire:null");
    const deserialize = vi.fn((_key: string, value: string) => value.slice(5));
    const reader = createReader({ get, set() {} }, {
      serializer: { serialize: (_key, value) => value, deserialize },
    });
    await expect(reader.getValue("empty", "fallback")).resolves.toBe("");
    await expect(reader.getObject("object", { fallback: true })).resolves.toBeNull();
    await expect(reader.getObject("empty", null)).rejects.toMatchObject({ code: "invalid-data" });
    expect(get).toHaveBeenCalledTimes(3);
    expect(deserialize).toHaveBeenCalledTimes(3);
  });

  it("snapshots object defaults before awaiting a read", async () => {
    let complete: (value: null) => void = () => { throw new Error("read did not start"); };
    const reader = createReader({
      get: () => new Promise<null>((resolve) => { complete = resolve; }),
      set() {},
    });
    const supplied = { nested: ["before"] };
    const pending = reader.getObject("missing", supplied);
    supplied.nested[0] = "after";
    complete(null);
    const result = await pending as typeof supplied;
    expect(result).toEqual({ nested: ["before"] });
    expect(result).not.toBe(supplied);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(result.nested)).toBe(Array.prototype);
    expect(result.nested.map((value) => value.toUpperCase())).toEqual(["BEFORE"]);
    result.nested[0] = "returned mutation";
    expect(supplied.nested).toEqual(["after"]);
  });

  it("rejects invalid defaults and keys before backend reads", async () => {
    const get = vi.fn(() => null);
    const reader = createReader({ get, set() {} });
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    const accessor = vi.fn(() => "private");
    const invalidObject = Object.defineProperty({}, "value", { enumerable: true, get: accessor });
    await expect(reader.getValue("missing", 0 as unknown as string)).rejects.toMatchObject({ code: "invalid-value" });
    for (const value of [cycle, invalidObject, Number.NaN]) {
      await expect(reader.getObject("missing", value as ObjectValue)).rejects.toMatchObject({ code: "invalid-value" });
    }
    await expect(reader.getValue("Invalid-name", "fallback")).rejects.toMatchObject({ code: "invalid-name" });
    expect(get).not.toHaveBeenCalled();
    expect(accessor).not.toHaveBeenCalled();
    await expect(reader.getValue("missing", "broken\ud800")).rejects.toMatchObject({ code: "invalid-value" });
    expect(get).not.toHaveBeenCalled();
  });

  it("does not replace backend, serializer, or malformed-data errors with defaults", async () => {
    const reader = createReader({ get() { throw new Error("private backend failure"); }, set() {} });
    await expect(reader.getValue("missing", "fallback")).rejects.toMatchObject({ code: "operation-failed" });
    await expect(reader.getObject("missing", {})).rejects.toMatchObject({ code: "operation-failed" });
    const decoding = createReader({ get: () => "ciphertext", set() {} }, {
      serializer: {
        serialize: (_key, value) => value,
        deserialize() { throw new Error("private decoder failure"); },
      },
    });
    await expect(decoding.getValue("missing", "fallback")).rejects.toMatchObject({ code: "operation-failed" });
    await expect(decoding.getObject("missing", {})).rejects.toMatchObject({ code: "operation-failed" });
    const malformed = createReader({ get: () => undefined as unknown as string, set() {} });
    await expect(malformed.getValue("missing", "fallback")).rejects.toMatchObject({ code: "invalid-data" });
    await expect(malformed.getObject("missing", {})).rejects.toMatchObject({ code: "invalid-data" });
  });
});
