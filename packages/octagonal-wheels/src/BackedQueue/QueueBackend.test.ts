import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { QueueBackend } from "./QueueBackend.ts";
import { QueueBackendMemory } from "./QueueBackendMemory.ts";
import { SimpleStoreIDB } from "../databases/SimpleStoreIDB.ts";
import { delay } from "../promises.ts";
import { DatabaseTransactionAbortError } from "../databases/dbcommon.ts";
import { ERROR_TRANSACTION_NOT_SUPPORTED, QueueBackendWithTransaction } from "./QueueBackendTypes.ts";

const impls = [QueueBackend, QueueBackendMemory];
for (const impl of impls) {
    let store: QueueBackendWithTransaction<string>;
    // let idb: Mocked<SimpleStoreIDB<string>>;
    let idb: SimpleStoreIDB<string>;
    describe(`QueueBackend ${impl.name}`, () => {
        afterEach(async () => {
            if (impl === QueueBackend) {
                await idb.destroy();
            }
            await delay(100);
        });
        beforeEach(async () => {
            const prefix = "r-prefix-" + Date.now() + "-";
            if (impl === QueueBackend) {
                idb = SimpleStoreIDB.open<string>("test-db");
                await idb.destroy();
                await delay(100);
                idb = SimpleStoreIDB.open<string>("test-db");
                // await idb.destroy();
                // idb = new SimpleStoreIDB<string>('test-db');
                store = new QueueBackend<string>(idb, "test", prefix);
            } else {
                store = new QueueBackendMemory<string>("test", prefix);
            }
        });
        it("should set and get queue items", async () => {
            await store.setQueueItem("item1", "value1");
            // expect(idb.set).toHaveBeenCalledWith('r-prefix-test-item1', 'value1');
            const value = await store.getQueuedItem("item1");
            // expect(idb.get).toHaveBeenCalledWith('r-prefix-test-item1');
            expect(value).toBe("value1");
        });
        it("should set and get processing items", async () => {
            await store.setProcessingItem("item2", "value2");
            await store.setProcessingItem("item3", "value3");
            const value2 = await store.getProcessingItem("item2");
            const value3 = await store.getProcessingItem("item3");
            expect(value2).toBe("value2");
            expect(value3).toBe("value3");
        });
        it("should delete queue items", async () => {
            await store.setQueueItem("item4", "value4");
            let value = await store.getQueuedItem("item4");
            expect(value).toBe("value4");
            await store.deleteQueueItem("item4");
            value = await store.getQueuedItem("item4");
            expect(value).toBeUndefined();
        });
        it("should delete processing items", async () => {
            await store.setProcessingItem("itemP1", "valueP1");
            let value = await store.getProcessingItem("itemP1");
            expect(value).toBe("valueP1");
            await store.deleteProcessingItem("itemP1");
            value = await store.getProcessingItem("itemP1");
            expect(value).toBeUndefined();
        });
        it("should handle items in transition (committed)", async () => {
            const itemKey = "item5";
            await store.setQueueItem(itemKey, "value5");

            let value = await store.getQueuedItem(itemKey);
            expect(value).toBe("value5");
            const r = store.atomic(async (txStore) => {
                const valueX = await txStore.getQueuedItem(itemKey);
                expect(valueX).toBe("value5");
                await txStore.setProcessingItem(itemKey, valueX!);
                await txStore.deleteQueueItem(itemKey);
            });
            await expect(r).resolves.not.toThrow();
            value = await store.getQueuedItem(itemKey);
            expect(value).toBeUndefined();
            value = await store.getProcessingItem(itemKey);
            expect(value).toBe("value5");
        });
        it("should handle items in transition (aborted)", async () => {
            const itemKey = "item6";
            await store.setQueueItem(itemKey, "value6");
            let value = await store.getQueuedItem(itemKey);
            expect(value).toBe("value6");
            const r = store.atomic(async (txStore) => {
                const valueX = await txStore.getQueuedItem(itemKey);
                expect(valueX).toBe("value6");
                await txStore.setProcessingItem(itemKey, valueX!);
                await txStore.deleteQueueItem(itemKey);
                const deleted = await txStore.getQueuedItem(itemKey);
                expect(deleted).toBeUndefined();
                throw new Error("Abort transaction");
            });
            await expect(r).rejects.toThrowError();

            value = await store.getQueuedItem(itemKey);
            expect(value).toBe("value6");
            value = await store.getProcessingItem(itemKey);
            expect(value).toBeUndefined();
        });
        it("should issues keys with correct ordering", async () => {
            const key1 = store.issueNewQueueKey();
            const key2 = store.issueNewQueueKey();
            const key3 = store.issueNewQueueKey();
            const diff1 = `${key2}`.localeCompare(`${key1}`);
            expect(diff1).toBeGreaterThan(0);
            const diff2 = `${key3}`.localeCompare(`${key2}`);
            expect(diff2).toBeGreaterThan(0);
        });
        it("should list keys correctly", async () => {
            await store.setQueueItem("a-item1", "value1");
            await store.setQueueItem("a-item2", "value2");
            await store.setQueueItem("b-item3", "value3");
            const keys = await store.keys(store.prefix + "a-", store.prefix + "a-zzzz");
            expect(keys).toEqual([store.prefix + "a-item1", store.prefix + "a-item2"]);
        });
        it("should list keys correctly with limit", async () => {
            for (let i = 1; i <= 25; i++) {
                await store.setQueueItem(`a-item${`${i}`.padStart(2, "0")}`, `value${i}`);
            }
            const keys = await store.keys(store.prefix + "a-item02", store.prefix + "a-zzzz", 2);
            expect(keys).toEqual([store.prefix + "a-item02", store.prefix + "a-item03"]);
        });
        it("should get next queue key correctly", async () => {
            await store.setQueueItem("a-item1", "value1");
            await store.setQueueItem("a-item2", "value2");
            await store.setQueueItem("b-item3", "value3");
            const nextKey = await store.getNextQueueKey();
            expect(nextKey).toBe("a-item1");
            const nextKey2 = await store.getNextQueueKey();
            expect(nextKey2).toBe("a-item1");
            await store.deleteQueueItem("a-item1");
            const nextKey3 = await store.getNextQueueKey();
            expect(nextKey3).toBe("a-item2");
            await store.deleteQueueItem("a-item2");
            await store.setProcessingItem("a-item2", "value2");
            const nextKey4 = await store.getNextQueueKey();
            expect(nextKey4).toBe("b-item3");
        });
        it("should return undefined for next queue key when empty", async () => {
            const nextKey = await store.getNextQueueKey();
            expect(nextKey).toBeUndefined();
        });
        it("should produce queues not within a single page", async () => {
            const totalItems = 100;
            for (let i = 0; i < totalItems; i++) {
                const key = store.issueNewQueueKey();
                await store.setQueueItem(key, `value-${i}`);
            }
            const keys: string[] = [];
            const values: string[] = [];
            do {
                const nextKey = await store.getNextQueueKey();
                if (!nextKey) break;
                keys.push(nextKey!);
                const value = await store.getQueuedItem(nextKey!);
                values.push(value!);
                await store.deleteQueueItem(nextKey!);
            } while (true);
            expect(keys.length).toBe(totalItems);
            expect(values.length).toBe(totalItems);
            for (let i = 0; i < totalItems; i++) {
                expect(values[i]).toBe(`value-${i}`);
            }
            for (let i = 1; i < keys.length; i++) {
                const diff = keys[i].localeCompare(keys[i - 1]);
                expect(diff).toBeGreaterThan(0);
            }
        });
    });
}

for (const impl of impls) {
    let store: QueueBackendWithTransaction<string>;
    // let idb: Mocked<SimpleStoreIDB<string>>;
    let idb: SimpleStoreIDB<string>;
    describe(`QueueBackend2 ${impl.name}`, () => {
        let store: QueueBackendWithTransaction<string>;
        let idb: SimpleStoreIDB<string>;
        const prefix = "r-prefix-" + Date.now() + "-";
        beforeEach(async () => {
            if (impl === QueueBackend) {
                idb = SimpleStoreIDB.open<string>("test-db");
                store = new QueueBackend<string>(idb, "test", prefix, (key: string) => {
                    return key.endsWith("-ignore");
                });
            } else {
                store = new QueueBackendMemory<string>("test", prefix, (key: string) => {
                    return key.endsWith("-ignore");
                });
            }
        });
        afterEach(async () => {
            if (impl === QueueBackend) {
                await idb.destroy();
            }
            await delay(100);
        });
        it("should produce queues not within a single page", async () => {
            const totalItems = 100;
            for (let i = 0; i < totalItems; i++) {
                const key = store.issueNewQueueKey();
                await store.setQueueItem(`should-ignore-${i}-ignore`, "value-ignore");
                await store.setQueueItem(key, `value-${i}`);
            }
            const keys: string[] = [];
            const values: string[] = [];
            do {
                const nextKey = await store.getNextQueueKey();
                if (!nextKey) break;
                keys.push(nextKey!);
                const value = await store.getQueuedItem(nextKey!);
                values.push(value!);
                await store.deleteQueueItem(nextKey!);
            } while (true);
            expect(keys.length).toBe(totalItems);
            expect(values.length).toBe(totalItems);
            for (let i = 0; i < totalItems; i++) {
                expect(values[i]).toBe(`value-${i}`);
            }
            for (let i = 1; i < keys.length; i++) {
                const diff = keys[i].localeCompare(keys[i - 1]);
                expect(diff).toBeGreaterThan(0);
            }
            const ignored = await store.keys("", "\uffff", 1000);
            for (const key of ignored) {
                if (!key.startsWith(store.prefix)) continue;
                expect(key.endsWith("-ignore")).toBe(true);
            }
        });
        it("should emit error on starting transaction if backend does not support transactions", async () => {
            const idb = SimpleStoreIDB.open<string>("test-db-no-tx");
            const txTask = () =>
                idb.beginTransaction(async (tx) => {
                    const storeX = new QueueBackend<string>(tx, "test", "prefix-");
                    const task = storeX.atomic(async (txStore) => {
                        // do nothing
                        txStore.getNextQueueKey();
                    });
                    await expect(task).rejects.toThrowError(ERROR_TRANSACTION_NOT_SUPPORTED);
                    await task;
                });
            await expect(txTask()).rejects.toThrowError(DatabaseTransactionAbortError);
            await idb.destroy();
        });
    });
}
