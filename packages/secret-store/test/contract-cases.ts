import { describe, expect, it } from "vitest";
import type { ObjectValue, SecretStore } from "../src/index.js";
import { SecretStoreError } from "../src/index.js";

/** Shared behavioural cases for a newly created, empty store. */
export function secretStoreContract(createStore: () => SecretStore | Promise<SecretStore>): void {
  describe("SecretStore contract", () => {
    it("uses defaults only for absence without persisting them", async () => {
      const store = await createStore();
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

    it("distinguishes an absent entry from an empty string", async () => {
      const store = await createStore();
      await expect(store.getValue("api-token")).resolves.toBeNull();
      await store.setValue("api-token", "");
      await expect(store.getValue("api-token")).resolves.toBe("");
      await expect(store.getValue("another-token")).resolves.toBeNull();
    });

    it.each([
      " \tvalue\r\n ",
      "\0embedded\0",
      "\ufeffleading-bom",
      "\u00e9 e\u0301 日本語 🔐",
      "\ud800\udc00\udbff\udfff",
      "fancy-sec://another-token",
    ])("preserves string data exactly (case %#)", async (value) => {
      const store = await createStore();
      await store.setValue("api-token", value);
      await expect(store.getValue("api-token")).resolves.toBe(value);
    });

    it("preserves JSON-shaped data, including top-level and nested falsy values", async () => {
      const store = await createStore();
      const value: ObjectValue = {
        empty: "",
        false: false,
        zero: 0,
        null: null,
        nested: [false, 0, "", null, { key: "value" }],
      };
      await store.setObject("api-token", value);
      await expect(store.getObject("api-token")).resolves.toEqual(value);

      for (const [name, entry] of [["false", false], ["zero", 0], ["empty", ""], ["null", null]] as const) {
        await store.setObject(name, entry);
        await expect(store.getObject(name)).resolves.toBe(entry);
      }
      await expect(store.getObject("missing-token")).resolves.toBeUndefined();
    });

    it("accepts 64-character names and rejects longer names without changing entries", async () => {
      const store = await createStore();
      const name = "a".repeat(64);
      await store.setValue(name, "original");
      await expect(store.getValue(name)).resolves.toBe("original");
      for (const length of [65, 128]) {
        const invalid = "a".repeat(length);
        await expect(store.getValue(invalid)).rejects.toMatchObject({ code: "invalid-name" });
        await expect(store.setValue(invalid, "replacement")).rejects.toMatchObject({ code: "invalid-name" });
      }
      await expect(store.getValue(name)).resolves.toBe("original");
    });

    it("replaces one entry without changing another", async () => {
      const store = await createStore();
      await store.setValue("api-token", "before");
      await store.setValue("db-token", "separate");
      await store.setValue("api-token", "after");
      await expect(store.getValue("api-token")).resolves.toBe("after");
      await expect(store.getValue("db-token")).resolves.toBe("separate");
    });

    it("rejects invalid names asynchronously without creating normalised entries", async () => {
      const store = await createStore();
      await store.setValue("api-token", "original");
      for (const name of ["API-token", "api-token\n", " api-token ", "fancy-sec://api-token"]) {
        let read: Promise<string | null> | undefined;
        let write: Promise<void> | undefined;
        expect(() => { read = store.getValue(name); }).not.toThrow();
        expect(() => { write = store.setValue(name, "replacement"); }).not.toThrow();
        await expect(read).rejects.toMatchObject({ code: "invalid-name" });
        await expect(write).rejects.toMatchObject({ code: "invalid-name" });
      }
      await expect(store.getValue("api-token")).resolves.toBe("original");
    });

    it.each(["\ud800", "\udfff", "a\ud800b", "\ud800\ud800", "\udc00\ud800", "\ud800\udc00\udfff"])(
      "rejects malformed Unicode without replacing an entry (case %#)",
      async (value) => {
        const store = await createStore();
        await store.setValue("api-token", "original");
        await expect(store.setValue("api-token", value)).rejects.toMatchObject({ code: "invalid-value" });
        await expect(store.getValue("api-token")).resolves.toBe("original");
        await expect(store.setValue("new-token", value)).rejects.toBeInstanceOf(SecretStoreError);
        await expect(store.getValue("new-token")).resolves.toBeNull();
      },
    );
  });
}
