import { describe, beforeEach, afterEach, test, expect, it } from "vitest";
import { SimpleStoreIDBv2 } from "./SimpleStoreIDBv2.ts";
import { DatabaseTransactionAbortError, DatabaseTransactionError, SIMPLE_STORE_EVENT_TYPES } from "./dbcommon.ts";
import { delay } from "../promises.ts";
import { deleteDB } from "idb";

describe("SimpleStoreIDBv2", () => {
    for (const openMethod of ["constructor", "static open"]) {
        describe(`Open method: ${openMethod}`, () => {
            let store: SimpleStoreIDBv2<string>;
            function _openStore(name: string, instanceName?: string) {
                if (openMethod === "constructor") {
                    return new SimpleStoreIDBv2<string>(name, instanceName);
                } else {
                    return SimpleStoreIDBv2.open<string>(name, instanceName);
                }
            }
            function openStore() {
                return _openStore("test-store");
            }
            beforeEach(() => {
                if (SimpleStoreIDBv2.hasActiveInstance("test-store")) {
                    SimpleStoreIDBv2.getActiveInstance("test-store")?.close();
                }
                store = openStore();
            });

            afterEach(async () => {
                if (store && !store.isDestroyed()) {
                    await store.destroy();
                } else if (store && store.isOpened()) {
                    store.close();
                }
            });

            test("should get unset value as undefined", async () => {
                const key = "test-key";

                const result = await store.get(key);

                expect(result).toBeUndefined();
            });
            test("should set and get a value", async () => {
                const key = "test-key";
                const value = "test-value";

                await store.set(key, value);
                const result = await store.get(key);

                expect(result).toBe(value);
            });

            test("should delete a value", async () => {
                const key = "test-key";
                const value = "test-value";

                await store.set(key, value);
                await store.delete(key);
                const result = await store.get(key);

                expect(result).toBeUndefined();
            });

            test("should return keys within a range", async () => {
                const keys = ["key1", "key2", "key3", "key4", "key5"];

                for (const key of keys) {
                    await store.set(key, "value");
                }

                const result = await store.keys("key2", "key4");

                expect(result).toEqual(["key2", "key3", "key4"]);
            });

            test("should return all keys", async () => {
                const keys = ["key1", "key2", "key3"];

                for (const key of keys) {
                    await store.set(key, "value");
                }

                const result = await store.keys();

                expect(result).toEqual(keys);
            });

            test("should clear all values", async () => {
                const keys = ["key1", "key2", "key3"];

                for (const key of keys) {
                    await store.set(key, "value");
                }

                await store.clear();

                for (const key of keys) {
                    const result = await store.get(key);
                    expect(result).toBeUndefined();
                }
            });
            test("should return all keys using keysIDB", async () => {
                const keys = ["key1", "key2", "key3"];

                for (const key of keys) {
                    await store.set(key, "value");
                }

                const result = await store.keysIDB();

                expect(result).toEqual(keys);
            });

            test("should return keys within a range using keysIDB", async () => {
                const keys = ["key1", "key2", "key3", "key4", "key5"];

                for (const key of keys) {
                    await store.set(key, "value");
                }

                const result = await store.keysIDB(IDBKeyRange.bound("key2", "key4"));

                expect(result).toEqual(["key2", "key3", "key4"]);
            });

            test("should return keys with a count limit using keysIDB", async () => {
                const keys = ["key1", "key2", "key3", "key4", "key5"];

                for (const key of keys) {
                    await store.set(key, "value");
                }

                const result = await store.keysIDB(undefined, 3);

                expect(result).toEqual(["key1", "key2", "key3"]);
            });
            test("should return all keys using keysIDB", async () => {
                const keys = ["key1", "key2", "key3"];

                for (const key of keys) {
                    await store.set(key, "value");
                }

                const result = await store.keysIDB();

                expect(result).toEqual(keys);
            });

            test("should return keys within a range using keysIDB", async () => {
                const keys = ["key1", "key2", "key3", "key4", "key5"];

                for (const key of keys) {
                    await store.set(key, "value");
                }

                const result = await store.keysIDB(IDBKeyRange.bound("key2", "key4"));

                expect(result).toEqual(["key2", "key3", "key4"]);
            });

            test("should return keys with a count limit using keysIDB", async () => {
                const keys = ["key1", "key2", "key3", "key4", "key5"];

                for (const key of keys) {
                    await store.set(key, "value");
                }

                const result = await store.keysIDB(undefined, 3);

                expect(result).toEqual(["key1", "key2", "key3"]);
            });

            test("should destroy the database", async () => {
                // Act
                await store.get("any-key"); // Ensure the database is opened
                expect(store.isOpened()).toBe(true);
                await store.set("temp-key", "temp-value");
                const beforeDestroyValue = await store.get("temp-key");
                expect(beforeDestroyValue).toBe("temp-value");
                await store.destroy();
                expect(store.isOpened()).toBe(false);

                const key = "test-key";
                await expect(async () => await store.clear()).rejects.toThrowError();
                await expect(async () => await store.delete(key)).rejects.toThrowError();
                await expect(async () => await store.set(key, "a")).rejects.toThrowError();
                await expect(async () => await store.get(key)).rejects.toThrowError();
                await expect(async () => await store.keys()).rejects.toThrowError();
                await expect(async () => await store.keysIDB()).rejects.toThrowError();
                await expect(async () => await store.destroy()).rejects.toThrowError();
                const store2 = openStore();
                const afterDestroyValue = await store2.get("temp-key");
                expect(afterDestroyValue).toBeUndefined();
            });
            test("should close the database", async () => {
                // Act
                await store.get("any-key"); // Ensure the database is opened
                expect(store.isOpened()).toBe(true);
                store.close();
                expect(store.isOpened()).toBe(false);

                // Assert
                // Verify that the database is closed by attempting to get a value
                const key = "test-key";
                await expect(async () => await store.clear()).rejects.toThrowError();
                await expect(async () => await store.delete(key)).rejects.toThrowError();
                await expect(async () => await store.set(key, "a")).rejects.toThrowError();
                await expect(async () => await store.get(key)).rejects.toThrowError();
                await expect(async () => await store.keys()).rejects.toThrowError();
                await expect(async () => await store.keysIDB()).rejects.toThrowError();
                expect(store.isOpened()).toBe(false);
            });
            if (openMethod === "static open") {
                test("should be destroyed via static method", async () => {
                    await store.set("temp-key", "temp-value");
                    const beforeDestroyValue = await store.get("temp-key");
                    expect(beforeDestroyValue).toBe("temp-value");
                    await SimpleStoreIDBv2.deleteDatabase("test-store");
                    const key = "test-key";
                    await expect(async () => await store.clear()).rejects.toThrowError();
                    await expect(async () => await store.delete(key)).rejects.toThrowError();
                    await expect(async () => await store.set(key, "a")).rejects.toThrowError();
                    await expect(async () => await store.get(key)).rejects.toThrowError();
                    await expect(async () => await store.keys()).rejects.toThrowError();
                    await expect(async () => await store.keysIDB()).rejects.toThrowError();
                    await expect(async () => await store.destroy()).rejects.toThrowError();
                    const store2 = openStore();
                    const afterDestroyValue = await store2.get("temp-key");
                    expect(afterDestroyValue).toBeUndefined();
                    await expect(SimpleStoreIDBv2.deleteDatabase("test-store")).resolves.toBeUndefined();
                });
            }
            it("should allow opening the same database with different instance names", async () => {
                const instanceName1 = "instance-1";
                const instanceName2 = "instance-2";
                const store1 = new SimpleStoreIDBv2<string>(storeName2, instanceName1);
                const store2 = _openStore(storeName2, instanceName2);
                expect(store1).toBeInstanceOf(SimpleStoreIDBv2);
                expect(store2).toBeInstanceOf(SimpleStoreIDBv2);
                await store1.set("key1", "value1");
                expect(await store1.get("key1")).toBe("value1");
                expect(await store2.get("key1")).toBe("value1");
                expect(await store2.get("key2")).toBeUndefined();
                expect(await store1.get("key2")).toBeUndefined();
                await store2.set("key2", "value2");
                expect(await store1.get("key2")).toBe("value2");
                expect(await store2.get("key2")).toBe("value2");
                await store1.destroy();
                await store2.destroy();
            });
        });
    }
    const storeName2 = "test-store-2";
    test("Should be retrievable via static method", async () => {
        const store1 = new SimpleStoreIDBv2<string>(storeName2);
        const store2 = SimpleStoreIDBv2.open<string>(storeName2);
        expect(store2).toBeInstanceOf(SimpleStoreIDBv2);
        expect(store1).toBeInstanceOf(SimpleStoreIDBv2);
        const retrievedStore = SimpleStoreIDBv2.getActiveInstance<string>(storeName2);
        expect(retrievedStore).toBe(store1);
        await store1.destroy();
        expect(store2.isOpened()).toBe(false);
    });

    test("it should throw error on constructing duplicate instance", async () => {
        const store1 = new SimpleStoreIDBv2<string>(storeName2);
        expect(store1).toBeInstanceOf(SimpleStoreIDBv2);
        expect(() => new SimpleStoreIDBv2<string>(storeName2)).toThrowError();
        store1.close();
        // await store1.destroy();
        const store2 = SimpleStoreIDBv2.open<string>(storeName2);
        expect(store2).toBeInstanceOf(SimpleStoreIDBv2);
        expect(() => new SimpleStoreIDBv2<string>(storeName2)).toThrowError();
        await store2.destroy();
    });

    it("should handle transaction commit properly", async () => {
        const store = SimpleStoreIDBv2.open<string>("transaction-test-store");
        expect(await store.get("key1")).toBeUndefined();
        expect(await store.get("key2")).toBeUndefined();
        await store.beginTransaction(async (tx) => {
            await tx.set("key1", "value1");
            await tx.set("key2", "value2");
            tx.commit();
        });
        expect(await store.get("key1")).toBe("value1");
        expect(await store.get("key2")).toBe("value2");
        await store.destroy();
    });
    it("should handle transaction abort properly", async () => {
        const store = SimpleStoreIDBv2.open<string>("transaction-abort-test-store");
        expect(await store.get("key1")).toBeUndefined();
        expect(await store.get("key2")).toBeUndefined();
        const tx = store.beginTransaction(async (tx) => {
            await tx.set("key1", "value1");
            await tx.set("key2", "value2");
            tx.abort();
        });
        await expect(tx).rejects.toThrowError();
        await delay(100);
        expect(await store.get("key1")).toBeUndefined();
        expect(await store.get("key2")).toBeUndefined();
        await store.destroy();
    });
    it("should handle error inside transaction properly", async () => {
        const store = SimpleStoreIDBv2.open<string>("transaction-error-test-store");
        expect(await store.get("key1")).toBeUndefined();
        expect(await store.get("key2")).toBeUndefined();
        const tx = store.beginTransaction(async (tx) => {
            await tx.set("key1", "value1");
            await tx.set("key2", "value2");
            throw new Error("Test error");
        });
        await expect(tx).rejects.toThrowError();
        await delay(100);
        expect(await store.get("key1")).toBeUndefined();
        expect(await store.get("key2")).toBeUndefined();
        await store.destroy();
    });
    it("should handle transaction for multiple operations (abort)", async () => {
        const store = SimpleStoreIDBv2.open<string>("transaction-multiple-ops-test-store");
        expect(await store.get("key1")).toBeUndefined();
        expect(await store.get("key2")).toBeUndefined();
        expect(await store.get("key3")).toBeUndefined();
        await store.set("key2", "initial-value2");
        const p = store.beginTransaction(async (tx) => {
            await tx.set("key1", "value1");
            await tx.delete("key2");
            await tx.set("key3", "value3");
            const p = await tx.get("key2");
            expect(p).toBeUndefined();
            expect(await tx.get("key1")).toBe("value1");
            await tx.set("key1", "updated-value1");
            expect(await tx.get("key1")).toBe("updated-value1");
            const keys = await tx.keys(undefined, undefined);
            expect(keys.sort()).toEqual(["key1", "key3"].sort());
            tx.abort();
        });
        await expect(p).rejects.toThrowError();
        expect(await store.get("key1")).toBeUndefined();
        expect(await store.get("key2")).toBe("initial-value2");
        expect(await store.get("key3")).toBeUndefined();
        const keysAfterAbort = await store.keys(undefined, undefined);
        expect(keysAfterAbort.sort()).toEqual(["key2"].sort());
        await store.destroy();
    });
    it("should handle transaction for multiple operations (commit)", async () => {
        const store = SimpleStoreIDBv2.open<string>("transaction-multiple-ops-test-store");
        expect(await store.get("key1")).toBeUndefined();
        expect(await store.get("key2")).toBeUndefined();
        expect(await store.get("key3")).toBeUndefined();
        await store.set("key2", "initial-value2");
        const p = store.beginTransaction(async (tx) => {
            await tx.set("key1", "value1");
            await tx.delete("key2");
            await tx.set("key3", "value3");
            const p = await tx.get("key2");
            expect(p).toBeUndefined();
            expect(await tx.get("key1")).toBe("value1");
            await tx.set("key1", "updated-value1");
            expect(await tx.get("key1")).toBe("updated-value1");
            await tx.set("key99", "value99");
            const keys = await tx.keys(undefined, "key3");
            expect(keys.sort()).toEqual(["key1", "key3"].sort());
            const allKeys = await tx.keys(undefined, undefined);
            expect(allKeys.sort()).toEqual(["key1", "key3", "key99"].sort());
            const keys2 = await tx.keys("key2", "key99");
            expect(keys2.sort()).toEqual(["key3", "key99"].sort());
            const keys3 = await tx.keys("key2", undefined);
            expect(keys3.sort()).toEqual(["key3", "key99"].sort());
            tx.commit();
        });
        await expect(p).resolves.toBeUndefined();
        expect(await store.get("key1")).toBe("updated-value1");
        expect(await store.get("key2")).toBeUndefined();
        expect(await store.get("key3")).toBe("value3");
        const keysAfterCommit = await store.keys(undefined, "key3");
        expect(keysAfterCommit.sort()).toEqual(["key1", "key3"].sort());
        const keysAfterCommitAll = await store.keys(undefined, undefined);
        expect(keysAfterCommitAll.sort()).toEqual(["key1", "key3", "key99"].sort());

        await store.destroy();
    });

    it("should wrap abort error properly", async () => {
        const store = SimpleStoreIDBv2.open<string>("transaction-abort-error-test-store");
        const p = store.beginTransaction(async (tx) => {
            await tx.set("key1", "value1");
            throw new Error("Simulated error to abort transaction");
        });
        await expect(p).rejects.toThrowError(DatabaseTransactionAbortError);
        const p2 = store.beginTransaction(async (tx) => {
            const val = await tx.get("key1");
            throw "Another error to abort";
        });
        await expect(p2).rejects.toThrowError(DatabaseTransactionAbortError);
        await store.destroy();
    });
    it("should automatically committed and cannot be aborted if eventloop has run", async () => {
        const store = SimpleStoreIDBv2.open<string>("transaction-deadlock-test-store");
        expect(await store.get("key1")).toBeUndefined();
        const p = store.beginTransaction(async (tx) => {
            await tx.set("key1", "value1");
            await delay(0); // Allow event loop to run
            await expect(tx.get("key1")).resolves.toBe("value2");
            tx.abort();
        });
        await expect(p).rejects.toThrowError(DatabaseTransactionError);
        await expect(store.get("key1")).resolves.toBe("value1");
        await store.destroy();
    });
    it("should no effect when the root connection committed", async () => {
        const store = SimpleStoreIDBv2.open<string>("transaction-commit-root-test-store");
        expect(await store.get("key1")).toBeUndefined();
        expect(store.commit()).toBeUndefined();
        await store.destroy();
    });
    it("should throw error when the root connection aborted", async () => {
        const store = SimpleStoreIDBv2.open<string>("transaction-abort-root-test-store");
        expect(await store.get("key1")).toBeUndefined();
        expect(() => store.abort()).toThrowError(DatabaseTransactionError);
        await store.destroy();
    });
    it("should handle destroy database directly after opening", async () => {
        const store = SimpleStoreIDBv2.open<string>("destroy-after-open-test-store");
        expect(await store.get("key1")).toBeUndefined();
        expect(store.isOpened()).toBe(true);
        await deleteDB("destroy-after-open-test-store");
        expect(store.isOpened()).toBe(false);
        await store.get("key1");
        expect(store.isOpened()).toBe(true);
    });
    it("should handle close database directly after opening", async () => {
        const store = SimpleStoreIDBv2.open<string>("close-after-open-test-store");
        expect(await store.get("key1")).toBeUndefined();
        expect(store.isOpened()).toBe(true);
        store.close();
        expect(store.isOpened()).toBe(false);
        await expect(() => store.get("key1")).toThrowError();
        expect(store.isOpened()).toBe(false);
    });
    it("should handle close database by direct IDB close", async () => {
        const store = SimpleStoreIDBv2.open<string>("idb-close-after-open-test-store");
        expect(await store.get("key1")).toBeUndefined();
        expect(store.isOpened()).toBe(true);
        (store as any)._db.close();
        await delay(100);
        // expect(store.isOpened()).toBe(false);
        // await expect(() => store.get("key1")).toThrowError();
        // expect(store.isOpened()).toBe(false);
    });
    it("should emit events on database state changes", async () => {
        let initialisedCalled = false;
        let closedCalled = false;
        let destroyedCalled = false;
        let openedCalled = false;
        let openCount = 0;
        let initCount = 0;
        expect(initialisedCalled).toBe(false);
        const store = SimpleStoreIDBv2.open<string>("event-test-store");
        store.addEventListener(SIMPLE_STORE_EVENT_TYPES.OPENED, (event) => {
            openedCalled = true;
            expect(event.type).toBe(SIMPLE_STORE_EVENT_TYPES.OPENED);
            // expect(event.detail.reason).toBe("Database opened");
            openCount = event.detail.count;
        });
        store.addEventListener(SIMPLE_STORE_EVENT_TYPES.INITIALISED, (event) => {
            initialisedCalled = true;
            expect(event.type).toBe(SIMPLE_STORE_EVENT_TYPES.INITIALISED);
            // expect(event.detail.reason).toBe("Database initialised");
            initCount = event.detail.count;
        });
        store.addEventListener(SIMPLE_STORE_EVENT_TYPES.CLOSED, (event) => {
            closedCalled = true;
            expect(event.type).toBe(SIMPLE_STORE_EVENT_TYPES.CLOSED);
            // expect(event.detail.reason).toBe("Database closed by user");
        });
        store.addEventListener(SIMPLE_STORE_EVENT_TYPES.DESTROYED, (event) => {
            destroyedCalled = true;
            expect(event.type).toBe(SIMPLE_STORE_EVENT_TYPES.DESTROYED);
            // expect(event.detail.reason).toBe("Database destroyed by user");
        });
        await delay(10);
        expect(openedCalled).toBe(false);
        expect(closedCalled).toBe(false);
        expect(destroyedCalled).toBe(false);
        await store.get("key1");
        // Force destroy by direct IDB delete
        await deleteDB("event-test-store");
        await delay(50);
        expect(closedCalled).toBe(false);
        // Init should be emitted immediately
        expect(initialisedCalled).toBe(true);
        expect(initCount).toBe(2);
        // Open should be emitted on first get so still count==1 here
        expect(openedCalled).toBe(true);
        expect(openCount).toBe(1);
        await store.get("key1");
        // Now should be opened again
        expect(openedCalled).toBe(true);
        expect(openCount).toBe(2);
        await store.destroy();
        expect(closedCalled).toBe(true);
        expect(destroyedCalled).toBe(true);
    });
    it("should able to remove event listeners", async () => {
        let openedCallCount = 0;
        const store = SimpleStoreIDBv2.open<string>("event-remove-listener-test-store");
        const openedListener = (event: any) => {
            openedCallCount++;
        };
        store.addEventListener(SIMPLE_STORE_EVENT_TYPES.OPENED, openedListener);
        await store.get("key1");
        expect(openedCallCount).toBe(1);
        // Force destroy by direct IDB delete
        await deleteDB("event-remove-listener-test-store");
        await delay(50);
        store.removeEventListener(SIMPLE_STORE_EVENT_TYPES.OPENED, openedListener);
        await store.get("key1");
        expect(openedCallCount).toBe(1);
        await store.destroy();
    });
    it("should accept multiple commit calls with errors", async () => {
        const store = SimpleStoreIDBv2.open<string>("transaction-multiple-commit-test-store");
        expect(await store.get("key1")).toBeUndefined();
        const p = store.beginTransaction(async (tx) => {
            await tx.set("key1", "value1");
            tx.commit();
            expect(() => tx.commit()).toThrowError();
        });
        await expect(p).resolves.toBeUndefined();
        expect(await store.get("key1")).toBe("value1");
        const p2 = store.beginTransaction(async (tx) => {
            await tx.set("key1", "value1");
            tx.abort();
            expect(() => tx.commit()).toThrowError();
        });
        await expect(p2).rejects.toThrowError();
        const p3 = store.beginTransaction(async (tx) => {
            await tx.set("key1", "value1");
            tx.abort();
            expect(() => tx.abort()).toThrowError();
        });
        await expect(p3).rejects.toThrowError(DatabaseTransactionAbortError);
        await store.destroy();
    });
    it("should accept reading database directly after opening", async () => {
        const store = SimpleStoreIDBv2.open<string>("read-after-open-test-store");
        expect(await store.get("key1")).toBeUndefined();
        await store.set("key1", "value1");
        const xDB = await store.db;
        expect(await xDB!.version).not.toBeUndefined();
        expect(await store.get("key1")).toBe("value1");
        await store.destroy();
    });
});
