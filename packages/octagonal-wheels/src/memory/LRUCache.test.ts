import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { LRUCache } from "./LRUCache";

describe("LRUCache", () => {
    let cache: LRUCache<number, string>;

    beforeEach(() => {
        cache = new LRUCache<number, string>(3, 100);
    });

    afterEach(() => {
        cache.clear();
    });

    test("should add key-value pairs to the cache", () => {
        cache.set(1, "Value 1");
        cache.set(2, "Value 2");
        cache.set(3, "Value 3");

        expect(cache.has(1)).toBe(true);
        expect(cache.has(2)).toBe(true);
        expect(cache.has(3)).toBe(true);
    });

    test("should retrieve values from the cache", () => {
        cache.set(1, "Value 1");
        cache.set(2, "Value 2");
        cache.set(3, "Value 3");

        expect(cache.get(1)).toBe("Value 1");
        expect(cache.get(2)).toBe("Value 2");
        expect(cache.get(3)).toBe("Value 3");
    });

    test("should update the recently used key when retrieving a value", () => {
        cache.set(1, "Value 1");
        cache.set(2, "Value 2");
        cache.set(3, "Value 3");

        cache.get(1);
        cache.get(2);

        cache.set(4, "Value 4");

        expect(cache.has(1)).toBe(true);
        expect(cache.has(2)).toBe(true);
        expect(cache.has(3)).toBe(false);
        expect(cache.has(4)).toBe(true);
    });

    test("should retrieve keys from the reversed cache", () => {
        cache.set(1, "Value 1");
        cache.set(2, "Value 2");
        cache.set(3, "Value 3");

        expect(cache.revGet("Value 1")).toBe(1);
        expect(cache.revGet("Value 2")).toBe(2);
        expect(cache.revGet("Value 3")).toBe(3);
    });

    test("should update the recently used key when retrieving a value from the reversed cache", () => {
        cache.set(1, "Value 1");
        cache.set(2, "Value 2");
        cache.set(3, "Value 3");

        cache.revGet("Value 1");
        cache.revGet("Value 2");

        cache.set(4, "Value 4");

        expect(cache.has(1)).toBe(true);
        expect(cache.has(2)).toBe(true);
        expect(cache.has(3)).toBe(false);
        expect(cache.has(4)).toBe(true);
    });

    test.each(["", 0, false, null, undefined])("refreshes recency when the cached value is %s", (value) => {
        const cache = new LRUCache<string, unknown>(2, 1);
        cache.set("first", value);
        cache.set("second", "second-value");

        expect(cache.get("first")).toBe(value);
        cache.set("third", "third-value");

        expect(cache.has("first")).toBe(true);
        expect(cache.has("second")).toBe(false);
        expect(cache.get("third")).toBe("third-value");
    });

    test.each(["", 0, false, null, undefined])("refreshes recency when reverse lookup returns key %s", (key) => {
        const cache = new LRUCache<unknown, string>(2, 1);
        cache.set(key, "first-value");
        cache.set("second", "second-value");

        expect(cache.revGet("first-value")).toBe(key);
        cache.set("third", "third-value");

        expect(cache.has(key)).toBe(true);
        expect(cache.has("second")).toBe(false);
        expect(cache.get("third")).toBe("third-value");
    });

    test("does not insert missing entries while looking them up", () => {
        const cache = new LRUCache<string, string>(2, 1);
        cache.set("first", "first-value");
        cache.set("second", "second-value");

        expect(cache.get("missing")).toBeUndefined();
        expect(cache.revGet("missing-value")).toBeUndefined();
        expect(cache.has("missing")).toBe(false);
        cache.set("third", "third-value");

        expect(cache.has("first")).toBe(false);
        expect(cache.has("second")).toBe(true);
        expect(cache.has("third")).toBe(true);
    });

    test("refreshes falsy values when reverse lookup is disabled", () => {
        const cache = new LRUCache<string, string>(2, 1, true);
        cache.set("first", "");
        cache.set("second", "second-value");

        expect(cache.get("first")).toBe("");
        expect(cache.revGet("")).toBeUndefined();
        cache.set("third", "third-value");

        expect(cache.has("first")).toBe(true);
        expect(cache.has("second")).toBe(false);
        expect(cache.has("third")).toBe(true);
    });

    test("should clear the cache", () => {
        cache.set(1, "Value 1");
        cache.set(2, "Value 2");
        cache.set(3, "Value 3");

        cache.clear();

        expect(cache.has(1)).toBe(false);
        expect(cache.has(2)).toBe(false);
        expect(cache.has(3)).toBe(false);
    });
});
