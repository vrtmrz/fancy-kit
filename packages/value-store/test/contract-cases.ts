import { describe, expect, it } from "vitest";
import type { ValueDeleter, ValueStore, ObjectValue } from "../src/contracts.js";
import { ValueStoreError } from "../src/errors.js";

export type ValueStoreFactory = () => ValueStore & ValueDeleter;

/** Applies the asynchronous local-value-store contract to an implementation. */
export function runValueStoreContract(createStore: ValueStoreFactory): void {
  describe("ValueStore contract", () => {
    it("uses defaults only for absence without persisting them", async () => {
      const store = createStore();
      await expect(store.getValue("missing", "")).resolves.toBe("");
      await expect(store.getValue("missing", "fallback")).resolves.toBe("fallback");
      await expect(store.getObject("missing", null)).resolves.toBeNull();
      await expect(store.getObject("missing", { nested: [false, 0, ""] })).resolves.toEqual({ nested: [false, 0, ""] });
      await expect(store.getValue("missing", undefined)).resolves.toBeNull();
      await expect(store.getObject("missing", undefined)).resolves.toBeUndefined();
      await store.setValue("present", "stored");
      await expect(store.getValue("present", "fallback")).resolves.toBe("stored");
      for (const value of [null, false, 0, ""] as const) {
        await store.setObject("object", value);
        await expect(store.getObject("object", { fallback: true })).resolves.toBe(value);
      }
      await store.setValue("malformed", "not JSON");
      await expect(store.getObject("malformed", null)).rejects.toMatchObject({ code: "invalid-data" });
    });

    it("returns null or undefined for missing values", async () => {
      const store = createStore();

      await expect(store.getValue("missing")).resolves.toBeNull();
      await expect(store.getObject("missing")).resolves.toBeUndefined();
    });

    it("stores empty strings as data and preserves exact strings", async () => {
      const store = createStore();
      const exactStrings = [
        "",
        "\u0000",
        "\uFEFF",
        "e\u0301",
        "\u00E9",
        "\uD800",
        "\uDC00",
        "\uD83D\uDE03",
        "0",
        "false",
      ];

      for (const [index, text] of exactStrings.entries()) {
        const key = `key-${index}`;
        await store.setValue(key, text);
        await expect(store.getValue(key)).resolves.toBe(text);
      }

      await store.setValue("empty", "");
      await expect(store.getValue("empty")).resolves.toBe("");
      await store.setValue("empty", "present");
      await store.delete("empty");
      await expect(store.getValue("empty")).resolves.toBeNull();
      await store.setValue("string-zero", "0");
      await store.setValue("string-false", "false");
      await expect(store.getValue("string-zero")).resolves.toBe("0");
      await expect(store.getValue("string-false")).resolves.toBe("false");
    });

    it("round-trips JSON values, including root and nested falsy values", async () => {
      const store = createStore();
      const values: ObjectValue[] = [
        null,
        false,
        0,
        "",
        { text: "value", nested: [false, 0, "", null, { flag: false }] },
        [null, false, 0, "", ["nested"]],
      ];

      for (const [index, value] of values.entries()) {
        await store.setObject(`object-${index}`, value);
        await expect(store.getObject(`object-${index}`)).resolves.toEqual(value);
      }
      await expect(store.getValue("object-0")).resolves.toBe("null");
    });

    it("copies values when setting and getting", async () => {
      const store = createStore();
      const supplied = { text: "before", nested: [0, false, "", null, { text: "nested" }] };
      const expected = { text: "before", nested: [0, false, "", null, { text: "nested" }] };

      await store.setObject("copy", supplied);
      supplied.text = "changed";
      (supplied.nested[4] as { text: string }).text = "changed";
      const returned = await store.getObject("copy") as typeof supplied;
      expect(returned).toEqual(expected);
      (returned.nested[4] as { text: string }).text = "returned mutation";
      await expect(store.getObject("copy")).resolves.toEqual(expected);
    });

    it("accepts null-prototype records as ordinary JSON values", async () => {
      const store = createStore();
      const value = Object.create(null) as { nested: ObjectValue };
      value.nested = ["value", false];

      await store.setObject("null-prototype", value);

      await expect(store.getObject("null-prototype")).resolves.toEqual({ nested: ["value", false] });
    });

    it("replaces values and deletes entries asynchronously", async () => {
      const store = createStore();

      await expect(store.setValue("same", "first")).resolves.toBeUndefined();
      await store.setValue("same", "second");
      await expect(store.getValue("same")).resolves.toBe("second");
      await expect(store.delete("same")).resolves.toBeUndefined();
      await expect(store.getValue("same")).resolves.toBeNull();
      await expect(store.delete("same")).resolves.toBeUndefined();
    });

    it("rejects invalid keys and values", async () => {
      const store = createStore();
      const untypedStore = store as unknown as {
        getValue(key: unknown): Promise<string | null>;
        setValue(key: unknown, value: unknown): Promise<void>;
        setObject(key: unknown, value: unknown): Promise<void>;
        delete(key: unknown): Promise<void>;
      };
      const cycle: Record<string, unknown> = {};
      cycle.self = cycle;
      let accessorReads = 0;
      const accessor = Object.defineProperty({}, "hidden", {
        enumerable: true,
        get: () => {
          accessorReads += 1;
          return "not read";
        },
      });
      let toJSONCalls = 0;
      const customSerialiser = {
        value: "not serialised",
        toJSON() {
          toJSONCalls += 1;
          return "not serialised";
        },
      };
      class CustomValue {
        value = "not a plain record";
      }
      const invalidObjects: unknown[] = [
        undefined,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        1n,
        Symbol("value"),
        () => undefined,
        new Date(),
        new Map(),
        new CustomValue(),
        cycle,
        accessor,
        customSerialiser,
        new Array(1),
      ];

      await expect(untypedStore.getValue(1)).rejects.toMatchObject({ code: "invalid-key" });
      await expect(untypedStore.delete(null)).rejects.toMatchObject({ code: "invalid-key" });
      await expect(untypedStore.setValue("key", undefined)).rejects.toMatchObject({ code: "invalid-value" });
      for (const value of invalidObjects) {
        await expect(untypedStore.setObject("key", value)).rejects.toBeInstanceOf(ValueStoreError);
        await expect(untypedStore.setObject("key", value)).rejects.toMatchObject({
          code: "invalid-value",
          message: "The value is invalid or unsupported.",
        });
      }
      expect(accessorReads).toBe(0);
      expect(toJSONCalls).toBe(0);
    });
  });
}
