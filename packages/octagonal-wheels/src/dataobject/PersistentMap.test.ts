import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { PersistentMap } from "./PersistentMap.ts";

describe("PersistentMap", () => {
    let map: PersistentMap<number>;

    beforeEach(() => {
        map = new PersistentMap<number>("test-map");
    });

    afterEach(() => {
        localStorage.removeItem("test-map");
    });

    test("should set and get values correctly", () => {
        map.set("key1", 1);
        map.set("key2", 2);

        expect(map.get("key1")).toBe(1);
        expect(map.get("key2")).toBe(2);
    });

    test("should return undefined for non-existing keys", () => {
        expect(map.get("non-existing-key")).toBeUndefined();
    });

    test("should return default value for non-existing keys when specified", () => {
        expect(map.get("non-existing-key", 0)).toBe(0);
    });

    test("should delete values correctly", () => {
        map.set("key1", 1);
        map.set("key2", 2);

        map.delete("key1");

        expect(map.has("key1")).toBe(false);
        expect(map.get("key1")).toBeUndefined();
        expect(map.get("key2")).toBe(2);
    });

    test("should clear all values", () => {
        map.set("key1", 1);
        map.set("key2", 2);

        map.clear();

        expect(map.has("key1")).toBe(false);
        expect(map.has("key2")).toBe(false);
    });

    test("should flush the map", () => {
        map.set("key1", 1);
        map.set("key2", 2);

        map.flush();

        const savedMap = JSON.parse(localStorage.getItem("test-map") || "[]");
        expect(savedMap).toEqual([
            ["key1", 1],
            ["key2", 2],
        ]);
    });
});
