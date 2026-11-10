import { describe, expect, it, vi } from "vitest";
import { MemoryValueStore, type ValueBatchOperation } from "../src/index.js";
import { createEnhancedValueStore, type EnhancedValueBackend } from "../src/enhanced-store.js";

function pause() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => { release = resolve; });
  return { promise, release };
}

function rawBackend(): EnhancedValueBackend {
  return { get: () => null, set: () => undefined, delete: () => undefined, writeBatch: () => undefined };
}

describe("MemoryValueStore capabilities", () => {
  it("deletes stored empty data without serialising deletion", async () => {
    const serialize = vi.fn((_key: string, value: string) => value);
    const store = new MemoryValueStore({ serializer: { serialize, deserialize: (_key, value) => value } });
    await store.setValue("key", ""); expect(await store.getValue("key")).toBe(""); serialize.mockClear();
    await store.delete("key"); expect(await store.getValue("key")).toBeNull();
    await store.delete("key"); expect(serialize).not.toHaveBeenCalled(); await store.dispose();
  });

  it("applies mixed mutations in order and treats empty strings and JSON null as present", async () => {
    const serialize = vi.fn((_key: string, value: string) => value);
    const store = new MemoryValueStore({ serializer: { serialize, deserialize: (_key, value) => value } });
    await store.writeBatch([
      { type: "setValue", key: "empty", value: "" },
      { type: "setValue", key: "empty", value: "skipped", ifAbsent: true },
      { type: "setObject", key: "null", value: null },
      { type: "setValue", key: "null", value: "skipped", ifAbsent: true },
      { type: "setValue", key: "ordered", value: "first", ifAbsent: true },
      { type: "delete", key: "ordered" },
      { type: "setObject", key: "ordered", value: [false, 0, ""], ifAbsent: true },
      { type: "setValue", key: "gone", value: "temporary" },
      { type: "delete", key: "gone" },
    ]);
    expect(serialize).toHaveBeenCalledTimes(7);
    expect(await store.getValue("empty")).toBe("");
    expect(await store.getObject("null")).toBeNull();
    expect(await store.getObject("ordered")).toEqual([false, 0, ""]);
    expect(await store.getValue("gone")).toBeNull();
    await store.clear();
    expect(await store.getValue("empty")).toBeNull();
    expect(await store.getObject("ordered")).toBeUndefined();
  });

  it("snapshots every descriptor, condition, array entry, and JSON value before serialisation awaits", async () => {
    const gate = pause();
    const serialize = vi.fn(async (key: string, value: string) => { if (key === "first") await gate.promise; return value; });
    const store = new MemoryValueStore({ serializer: { serialize, deserialize: (_key, value) => value } });
    await store.setValue("json", "old");
    serialize.mockClear();
    const object = { nested: [false, 0, ""] };
    const second = { type: "setObject" as const, key: "json", value: object, ifAbsent: false };
    const operations: ValueBatchOperation[] = [{ type: "setValue", key: "first", value: "original" }, second];
    const writing = store.writeBatch(operations);
    expect(serialize).toHaveBeenCalledOnce();
    second.key = "changed";
    second.ifAbsent = true;
    object.nested[0] = true;
    operations[0] = { type: "delete", key: "first" };
    operations.length = 1;
    gate.release();
    await writing;
    expect(serialize.mock.calls).toEqual([["first", "original"], ["json", '{"nested":[false,0,""]}']]);
    expect(await store.getValue("first")).toBe("original");
    expect(await store.getObject("json")).toEqual({ nested: [false, 0, ""] });
    expect(await store.getValue("changed")).toBeNull();
  });

  it("checks conditional presence when applying and keeps reads on stored state during preparation", async () => {
    const gate = pause();
    const store = new MemoryValueStore({
      serializer: {
        async serialize(_key, value) { if (value === "batch") await gate.promise; return value; },
        deserialize: (_key, value) => value,
      },
    });
    const batch = store.writeBatch([{ type: "setValue", key: "key", value: "batch", ifAbsent: true }]);
    expect(await store.getValue("key")).toBeNull();
    await store.setValue("key", "ordinary");
    gate.release();
    await batch;
    expect(await store.getValue("key")).toBe("ordinary");
  });

  it("does not cancel a preparing write when clearing", async () => {
    const gate = pause();
    const store = new MemoryValueStore({ serializer: {
      async serialize(_key, value) { await gate.promise; return value; },
      deserialize: (_key, value) => value,
    } });
    const writing = store.writeBatch([{ type: "setValue", key: "key", value: "after-clear" }]);
    await store.clear();
    gate.release();
    await writing;
    expect(await store.getValue("key")).toBe("after-clear");
    const other = new MemoryValueStore();
    await other.setValue("key", "independent");
    await store.clear();
    expect(await other.getValue("key")).toBe("independent");
  });

  it("leaves existing state intact when later serialisation fails", async () => {
    const store = new MemoryValueStore({ serializer: {
      serialize(_key, value) { if (value === "bad") throw new Error("private-value"); return value; },
      deserialize: (_key, value) => value,
    } });
    await store.setValue("key", "old");
    await expect(store.writeBatch([
      { type: "setValue", key: "key", value: "prepared" },
      { type: "setValue", key: "later", value: "bad" },
    ])).rejects.toMatchObject({ code: "operation-failed", message: "The storage operation failed." });
    expect(await store.getValue("key")).toBe("old");
    expect(await store.getValue("later")).toBeNull();
  });
});

describe("shared batch preparation", () => {
  it("preserves immediate raw application for ordinary identity-serialised writes", async () => {
    const set = vi.fn();
    const store = createEnhancedValueStore({ ...rawBackend(), set });
    const writing = store.setValue("key", "value");
    expect(set).toHaveBeenCalledExactlyOnceWith("key", "value");
    await writing;
  });

  it.each([
    null,
    {},
    [undefined],
    new Array(1),
    [{ type: "other", key: "key" }],
    [{ type: "setValue", key: 1, value: "value" }],
    [{ type: "setValue", key: "key", value: false }],
    [{ type: "setValue", key: "key", value: "value", ifAbsent: 1 }],
    [{ type: "setObject", key: "key", value: { invalid: undefined } }],
  ])("rejects malformed input %j before serialisation or backend mutation", async (invalid) => {
    const serialize = vi.fn((_key: string, value: string) => value);
    const writeBatch = vi.fn();
    const store = createEnhancedValueStore({ ...rawBackend(), writeBatch }, { serializer: {
      serialize, deserialize: (_key, value) => value,
    } });
    const operations = Array.isArray(invalid)
      ? [{ type: "setValue", key: "first", value: "valid" }, ...invalid]
      : invalid;
    await expect(store.writeBatch(operations as readonly ValueBatchOperation[])).rejects.toHaveProperty("code");
    expect(serialize).not.toHaveBeenCalled();
    expect(writeBatch).not.toHaveBeenCalled();
  });

  it("rejects descriptor accessors without invoking them", async () => {
    const getter = vi.fn(() => "private");
    const operation = { type: "setValue" as const, key: "key", get value() { return getter(); } };
    const store = new MemoryValueStore();
    await expect(store.writeBatch([operation])).rejects.toMatchObject({ code: "invalid-value" });
    expect(getter).not.toHaveBeenCalled();
    const object = { get private() { return getter(); } };
    await expect(store.writeBatch([{ type: "setObject", key: "key", value: object }])).rejects.toMatchObject({ code: "invalid-value" });
    expect(getter).not.toHaveBeenCalled();
  });

  it("captures one serialiser pair with its receiver for ordinary writes and batches", async () => {
    const reads = { serializer: 0, serialize: 0, deserialize: 0 };
    const values: string[] = [];
    const serializer = {
      marker: "captured:",
      get serialize() {
        reads.serialize += 1;
        return function (this: { marker: string }, key: string, value: string) { values.push(key); return this.marker + value; };
      },
      get deserialize() {
        reads.deserialize += 1;
        return function (this: { marker: string }, _key: string, value: string) { return value.slice(this.marker.length); };
      },
    };
    const options = { get serializer() { reads.serializer += 1; return serializer; } };
    const applied: unknown[] = [];
    const store = createEnhancedValueStore({ ...rawBackend(),
      set: (_key, value) => { applied.push(value); },
      writeBatch: (operations) => { applied.push(operations); },
    }, options);
    Object.defineProperty(serializer, "serialize", { value: () => { throw new Error("replacement"); } });
    await store.setValue("single", "one");
    await store.writeBatch([
      { type: "setObject", key: "object", value: false },
      { type: "delete", key: "deleted" },
      { type: "setValue", key: "conditional", value: "", ifAbsent: true },
    ]);
    expect(reads).toEqual({ serializer: 1, serialize: 1, deserialize: 1 });
    expect(values).toEqual(["single", "object", "conditional"]);
    expect(applied).toEqual(["captured:one", [
      { type: "set", key: "object", value: "captured:false", ifAbsent: undefined },
      { type: "delete", key: "deleted" },
      { type: "set", key: "conditional", value: "captured:", ifAbsent: true },
    ]]);
  });

  it("still invokes the raw empty batch to observe initialisation failures", async () => {
    const writeBatch = vi.fn(() => { throw new Error("private-init-failure"); });
    const get = vi.fn(() => null);
    const set = vi.fn();
    const remove = vi.fn();
    const store = createEnhancedValueStore({ get, set, delete: remove, writeBatch });
    await expect(store.writeBatch([])).rejects.toMatchObject({ code: "operation-failed" });
    expect(writeBatch).toHaveBeenCalledExactlyOnceWith([]);
    expect(get).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});

describe("enhanced store lifecycle", () => {
  it("starts before validation, finishes accepted failures, and skips finish when admission fails", async () => {
    const events: string[] = [];
    const onStart = vi.fn(() => { events.push("start"); });
    const onFinish = vi.fn(() => { events.push("finish"); });
    const store = createEnhancedValueStore(rawBackend(), undefined, { onStart, onFinish, dispose: () => undefined });
    const invalid = store.setValue("key", 1 as never);
    expect(events).toEqual(["start"]);
    await expect(invalid).rejects.toMatchObject({ code: "invalid-value" });
    expect(events).toEqual(["start", "finish"]);
    onStart.mockImplementation(() => { throw new Error("private-fault"); });
    await expect(store.getValue("key")).rejects.toMatchObject({ code: "operation-failed" });
    expect(onFinish).toHaveBeenCalledOnce();
    await expect(store.dispose()).resolves.toBeUndefined();
  });

  it("drains pending batch preparation and stops all admission synchronously", async () => {
    const gate = pause();
    const events: string[] = [];
    const close = vi.fn(() => { events.push("dispose"); });
    const writeBatch = vi.fn(() => { events.push("apply"); });
    const store = createEnhancedValueStore({ ...rawBackend(), writeBatch, clear: () => undefined }, { serializer: {
      async serialize(_key, value) { events.push("serialize"); await gate.promise; return value; },
      deserialize: (_key, value) => value,
    } }, {
      onStart: () => { events.push("start"); },
      onFinish: () => { events.push("finish"); },
      dispose: close,
    });
    const writing = store.writeBatch([{ type: "setValue", key: "key", value: "value" }]);
    expect(events).toEqual(["start", "serialize"]);
    const disposal = store.dispose();
    expect(store.dispose()).toBe(disposal);
    await expect(store.getValue("key")).rejects.toMatchObject({ code: "unavailable" });
    await expect(store.getObject("key")).rejects.toMatchObject({ code: "unavailable" });
    await expect(store.setValue("key", "later")).rejects.toMatchObject({ code: "unavailable" });
    await expect(store.setObject("key", null)).rejects.toMatchObject({ code: "unavailable" });
    await expect(store.delete("key")).rejects.toMatchObject({ code: "unavailable" });
    await expect(store.writeBatch([])).rejects.toMatchObject({ code: "unavailable" });
    await expect(store.clear()).rejects.toMatchObject({ code: "unavailable" });
    expect(close).not.toHaveBeenCalled();
    expect(writeBatch).not.toHaveBeenCalled();
    gate.release();
    await writing;
    await disposal;
    expect(events).toEqual(["start", "serialize", "apply", "finish", "dispose"]);
    expect(close).toHaveBeenCalledOnce();
  });

  it("keeps read decoding accepted until it settles, preserving ordinary defaults and JSON values", async () => {
    const gate = pause();
    const started = pause();
    const finish = vi.fn();
    const close = vi.fn();
    const store = createEnhancedValueStore({ ...rawBackend(), get: (key) => key === "stored" ? "null" : null }, { serializer: {
      serialize: (_key, value) => value,
      async deserialize(_key, value) { started.release(); await gate.promise; return value; },
    } }, { onStart: () => undefined, onFinish: finish, dispose: close });
    const reading = store.getObject("stored", { fallback: true });
    await started.promise;
    const defaultValue = { nested: [0] };
    const absent = store.getObject("absent", defaultValue);
    defaultValue.nested[0] = 9;
    const disposal = store.dispose();
    expect(await absent).toEqual({ nested: [0] });
    expect(close).not.toHaveBeenCalled();
    expect(finish).toHaveBeenCalledOnce();
    gate.release();
    expect(await reading).toBeNull();
    await disposal;
    expect(finish).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledOnce();
  });

  it("does not replay failed operations through disposal and sanitises a terminal close error once", async () => {
    const gate = pause();
    const close = vi.fn(() => { throw new Error("private-close"); });
    const store = createEnhancedValueStore(rawBackend(), { serializer: {
      async serialize() { await gate.promise; throw new Error("private-operation"); },
      deserialize: (_key, value) => value,
    } }, { onStart: () => undefined, onFinish: () => undefined, dispose: close });
    const writing = store.setValue("key", "value");
    const rejectedWrite = expect(writing).rejects.toMatchObject({ code: "operation-failed" });
    const disposal = store.dispose();
    const rejectedDisposal = expect(disposal).rejects.toMatchObject({ code: "operation-failed", message: "The storage operation failed." });
    gate.release();
    await rejectedWrite;
    await rejectedDisposal;
    expect(store.dispose()).toBe(disposal);
    expect(close).toHaveBeenCalledOnce();

    const successfulDisposal = createEnhancedValueStore({ ...rawBackend(), get() { throw new Error("read-failure"); } });
    await expect(successfulDisposal.getValue("key")).rejects.toHaveProperty("code", "operation-failed");
    await expect(successfulDisposal.dispose()).resolves.toBeUndefined();
  });
});
