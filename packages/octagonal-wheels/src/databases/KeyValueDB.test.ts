import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { OpenKeyValueDatabase, KeyValueDatabase } from "./KeyValueDB.ts";

describe("OpenKeyValueDatabase", () => {
    let database: KeyValueDatabase;

    beforeEach(async () => {
        database = await OpenKeyValueDatabase("test-db");
    });

    afterEach(() => {
        database.destroy();
    });

    test("should get unset value as undefined", async () => {
        const key = "test-key";

        const result = await database.get(key);

        expect(result).toBeUndefined();
    });
    test("should set and get a value", async () => {
        const key = "test-key";
        const value = "test-value";

        await database.set(key, value);
        const result = await database.get(key);

        expect(result).toBe(value);
    });

    test("should delete a value", async () => {
        const key = "test-key";
        const value = "test-value";

        await database.set(key, value);
        await database.del(key);
        const result = await database.get(key);

        expect(result).toBeUndefined();
    });

    test("should return keys within a range", async () => {
        const keys = ["key1", "key2", "key3", "key4", "key5"];

        for (const key of keys) {
            await database.set(key, "value");
        }

        const result = await database.keys(IDBKeyRange.bound("key2", "key4"));

        expect(result).toEqual(["key2", "key3", "key4"]);
    });

    test("should return all keys", async () => {
        const keys = ["key1", "key2", "key3"];

        for (const key of keys) {
            await database.set(key, "value");
        }

        const result = await database.keys();

        expect(result).toEqual(keys);
    });

    test("should clear all values", async () => {
        const keys = ["key1", "key2", "key3"];

        for (const key of keys) {
            await database.set(key, "value");
        }

        await database.clear();

        for (const key of keys) {
            const result = await database.get(key);
            expect(result).toBeUndefined();
        }
    });
    test("should destroy the database", async () => {
        // Act
        await database.destroy();

        const key = "test-key";
        await expect(async () => await database.clear()).rejects.toThrowError();
        await expect(async () => await database.del(key)).rejects.toThrowError();
        await expect(async () => await database.set(key, "a")).rejects.toThrowError();
        await expect(async () => await database.get(key)).rejects.toThrowError();
        await expect(async () => await database.keys()).rejects.toThrowError();
    });
    test("should close the database", async () => {
        // Act
        database.close();

        // Assert
        // Verify that the database is closed by attempting to get a value
        const key = "test-key";
        await expect(async () => await database.clear()).rejects.toThrowError();
        await expect(async () => await database.del(key)).rejects.toThrowError();
        await expect(async () => await database.set(key, "a")).rejects.toThrowError();
        await expect(async () => await database.get(key)).rejects.toThrowError();
        await expect(async () => await database.keys()).rejects.toThrowError();
    });
});
