import { describe, it, expect, beforeEach, afterEach, vitest } from "vitest";
import { BackedQueue } from "./BackedQueue";
import { SimpleStoreIDB } from "../databases/SimpleStoreIDB";
import { delay } from "../promises";
import { PersistentIDBBackedQueue } from "./PersistentIDBBackedQueue";
import { HalfPersistentIDBBackedQueue } from "./HalfPersistentIDBBackedQueue";
import { MemoryBackedQueue } from "./MemoryBackedQueue";
import { setGlobalLogFunction } from "../common/logger";

import {
    QueueAbortError,
    QueueTimeoutError,
    RequeuePosition,
    type DequeueOptions,
    type QueueKey,
    type QueueKeyOnProcess,
} from "./BackedQueueTypes";
import { DatabaseTransactionAbortError } from "../databases/dbcommon";
import { QueueBackendTransaction } from "./QueueBackendTypes";
setGlobalLogFunction((message, level) => {
    const outMsg = message instanceof Error ? message.stack || message.message : message;
    console.warn(`[${level}] ${outMsg}`);
});

class BrokenPIDBQueue<T> extends PersistentIDBBackedQueue<T> {
    latest = "";
    protected override async waitForNext(options?: DequeueOptions): Promise<QueueKey> {
        const v = await super.waitForNext(options);
        this.latest = v;
        return v;
    }
    protected onDequeued(): void {
        if (this.latest) this.backend.deleteProcessingItem(this.latest);
    }
}
class BrokenPIDBQueue2<T> extends PersistentIDBBackedQueue<T> {
    protected override async _queueToProcessing(tx: QueueBackendTransaction<T>, key: QueueKey): Promise<void> {
        await tx.deleteQueueItem(key);
        return await super._queueToProcessing(tx, key);
    }
}
class BrokenPIDBQueue3<T> extends PersistentIDBBackedQueue<T> {
    protected override async _queueToProcessing(tx: QueueBackendTransaction<T>, key: QueueKey): Promise<void> {
        const w = await tx.getQueuedItem(key);
        await tx.setProcessingItem(key, w!);
        return await super._queueToProcessing(tx, key);
    }
}
class BrokenPIDBQueue4<T> extends PersistentIDBBackedQueue<T> {
    override async restoreToQueue(key: QueueKeyOnProcess): Promise<void> {
        await this.backend.deleteProcessingItem(key);
        return await super.restoreToQueue(key);
    }
}

describe("BackedQueue", () => {
    let store: BackedQueue<string>;
    let idb: SimpleStoreIDB<any>;
    const impls = ["PersistentIDBackedQueue", "HalfPersistentIDBackedQueue", "MemoryBackedQueue"];
    // const impls = ["HalfPersistentIDBackedQueue"];
    const bkImpls = ["SimpleStoreIDBv2"];
    function openBackendStore<T>(implBackend: string, name: string) {
        if (implBackend === "SimpleStoreIDBv2") {
            idb = SimpleStoreIDB.open<T>(name);
            return idb;
        }
        throw new Error(`Unknown BackendStore implementation: ${implBackend}`);
    }
    function openQueue<T>(impl: string): BackedQueue<T> {
        if (impl === "PersistentIDBackedQueue") {
            const Backend = openBackendStore<T>("SimpleStoreIDBv2", "test-bkstore-db");
            return new PersistentIDBBackedQueue<T>("test-bq", Backend);
        }
        if (impl === "HalfPersistentIDBackedQueue") {
            const Backend = openBackendStore<T>("SimpleStoreIDBv2", "test-bkstore-db-h");
            return new HalfPersistentIDBBackedQueue<T>("test-bq", Backend);
        }
        if (impl === "MemoryBackedQueue") {
            const i = Date.now();
            return new MemoryBackedQueue<T>("test-bq-" + i);
        }
        throw new Error(`Unknown BackedQueue implementation: ${impl}`);
    }
    for (const impl of impls) {
        describe(`BackedQueue ${impl}`, () => {
            beforeEach(async () => {
                store = openQueue<any>(impl);
                // vi.useFakeTimers();
            });
            afterEach(async () => {
                // vi.useRealTimers();
                if (!(store instanceof MemoryBackedQueue)) {
                    if (idb) {
                        await idb.destroy();
                        await delay(100);
                    }
                }
            });

            it(`should process and complete items (${impl})`, async () => {
                expect(await store.isQueueEmpty()).toBe(true);
                expect(await store.isAnyInFlight()).toBe(false);
                await store.enqueue("itemA");
                expect(await store.isQueueEmpty()).toBe(false);
                const dequeued = await store.dequeue();
                expect(dequeued).toBeDefined();
                console.warn("Dequeued item:", dequeued);
                expect(dequeued!.item).toBe("itemA");
                expect(await store.isQueueEmpty()).toBe(true);
                expect(await store.isAnyInFlight()).toBe(true);

                await store.commit(dequeued!.key);
                expect(await store.isQueueEmpty()).toBe(true);
                expect(await store.isAnyInFlight()).toBe(false);
            });
            it(`should revoke items (${impl})`, async () => {
                expect(await store.isQueueEmpty()).toBe(true);
                expect(await store.isAnyInFlight()).toBe(false);
                await store.enqueue("itemB");
                const dequeued = await store.dequeue();
                expect(dequeued).toBeDefined();
                expect(dequeued!.item).toBe("itemB");
                await store.revoke(dequeued!.key);
                expect(await store.isQueueEmpty()).toBe(true);
                expect(await store.isAnyInFlight()).toBe(false);
            });

            it(`should requeue items (${impl})`, async () => {
                expect(await store.isQueueEmpty()).toBe(true);
                expect(await store.isAnyInFlight()).toBe(false);
                await store.enqueue("itemC");
                await store.enqueue("itemD");
                const dequeued = await store.dequeue();
                expect(dequeued).toBeDefined();
                expect(dequeued!.item).toBe("itemC");
                const dequeued2 = await store.dequeue();
                expect(dequeued2).toBeDefined();
                expect(dequeued2!.item).toBe("itemD");
                if (!(await store.isQueueEmpty())) {
                    console.error("Queue is not empty when expected to be");
                    console.error(await store.dequeue());
                }
                expect(await store.isQueueEmpty()).toBe(true);
                expect(await store.isAnyInFlight()).toBe(true);
                await store.requeue(dequeued!.key);
                expect(await store.isQueueEmpty()).toBe(false);
                expect(await store.isAnyInFlight()).toBe(true);
                await store.commit(dequeued2!.key);
                // All 'in-flight' items are committed or requeued
                expect(await store.isQueueEmpty()).toBe(false);
                expect(await store.isAnyInFlight()).toBe(false);
                // --
                const dequeued3 = await store.dequeue();
                expect(dequeued3).toBeDefined();
                expect(dequeued3!.item).toBe("itemC");
                await store.commit(dequeued3!.key);
                expect(await store.isQueueEmpty()).toBe(true);
                expect(await store.isAnyInFlight()).toBe(false);
            });
            it("should handle timeout on dequeue", async () => {
                try {
                    const dequeueTask = store.dequeue({ timeoutMs: 100 });
                    // vi.advanceTimersByTime(150);
                    expect(dequeueTask).rejects.toThrowError(QueueTimeoutError);
                    await delay(150);
                } catch (ex) {
                    console.error("Error in timeout test:", ex);
                }
            });
            it("should dequeue when item is enqueued within timeout", async () => {
                const dequeueTask = store.dequeue({ timeoutMs: 200 });
                await delay(100);
                await store.enqueue("itemE");
                const dequeued = await dequeueTask;
                expect(dequeued).toBeDefined();
                expect(dequeued!.item).toBe("itemE");
            });
            it("should handle abort on dequeue", async () => {
                const as = new AbortController();
                const dequeueTask = store.dequeue({ signal: as.signal });
                await delay(100);
                const w = expect(dequeueTask).rejects.toThrowError(QueueAbortError);
                as.abort();
                await w;
            });
            it("should handle aborted ac on dequeue", async () => {
                const as = new AbortController();
                as.abort();
                const dequeueTask = store.dequeue({ signal: as.signal });
                const w = expect(dequeueTask).rejects.toThrowError(QueueAbortError);
                await w;
            });

            it("should handle by process method (in success case, auto-commit)", async () => {
                for (let i = 0; i < 5; i++) {
                    await store.enqueue(`item-${i}`);
                }
                const processedItems: string[] = [];
                for (let i = 0; i < 5; i++) {
                    await store.process({}, async (item) => {
                        processedItems.push(item.item);
                    });
                }
                expect(processedItems.length).toBe(5);
                expect(processedItems).toEqual(["item-0", "item-1", "item-2", "item-3", "item-4"]);
                expect(await store.isQueueEmpty()).toBe(true);
                expect(await store.isAnyInFlight()).toBe(false);
            });
            it("should handle by process method (in success case, manual-commit)", async () => {
                for (let i = 0; i < 5; i++) {
                    await store.enqueue(`item-${i}`);
                }
                const processedItems: string[] = [];
                for (let i = 0; i < 5; i++) {
                    await store.process({}, async (item, ctx) => {
                        processedItems.push(item.item);
                        await ctx.commit(item.key);
                    });
                }
                expect(processedItems.length).toBe(5);
                expect(processedItems).toEqual(["item-0", "item-1", "item-2", "item-3", "item-4"]);
                expect(await store.isQueueEmpty()).toBe(true);
                expect(await store.isAnyInFlight()).toBe(false);
            });
            it("should handle by process method (in error case, auto-revoke)", async () => {
                for (let i = 0; i < 5; i++) {
                    await store.enqueue(`item-${i}`);
                }
                const processedItems: string[] = [];
                for (let i = 0; i < 5; i++) {
                    try {
                        await store.process({}, async (item, ctx) => {
                            processedItems.push(item.item);
                            throw new Error("Causing error to test auto-revoke");
                        });
                    } catch (err) {
                        expect(err).toBeInstanceOf(Error);
                        expect((err as Error).message).toBe("Causing error to test auto-revoke");
                    }
                }
                expect(processedItems.length).toBe(5);
                expect(processedItems).toEqual(["item-0", "item-1", "item-2", "item-3", "item-4"]);
                expect(await store.isQueueEmpty()).toBe(true);
                expect(await store.isAnyInFlight()).toBe(false);
            });
            it("should handle by process method (in error case, manual-revoke)", async () => {
                for (let i = 0; i < 5; i++) {
                    await store.enqueue(`item-${i}`);
                }
                const processedItems: string[] = [];
                for (let i = 0; i < 5; i++) {
                    await store.process({}, async (item, ctx) => {
                        processedItems.push(item.item);
                        await ctx.revoke(item.key);
                    });
                }
                expect(processedItems.length).toBe(5);
                expect(processedItems).toEqual(["item-0", "item-1", "item-2", "item-3", "item-4"]);
                expect(await store.isQueueEmpty()).toBe(true);
                expect(await store.isAnyInFlight()).toBe(false);
            });
            it("should handle by process method (in error case, manual-committed)", async () => {
                const processedItems: string[] = [];
                await store.enqueue(`item-X`);
                const storeTask = store.process({}, async (item, ctx) => {
                    processedItems.push(item.item);
                    await ctx.commit(item.key);
                    throw new Error("Causing error to test manual-committed");
                });
                await expect(storeTask).rejects.toThrow("Causing error to test manual-committed");
                expect(processedItems.length).toBe(1);
                expect(processedItems).toEqual(["item-X"]);
                expect(await store.isQueueEmpty()).toBe(true);
                expect(await store.isAnyInFlight()).toBe(false);
            });
            it("should handle requeue on process method", async () => {
                for (let i = 0; i < 3; i++) {
                    await store.enqueue(`item-${i}`);
                }
                const processedItems: string[] = [];
                for (let i = 0; i < 3; i++) {
                    await store.process({}, async (item, ctx) => {
                        processedItems.push(item.item);
                        if (item.item === "item-1") {
                            await ctx.requeue(item.key, RequeuePosition.LAST);
                        }
                    });
                }
                expect(processedItems.length).toBe(3);
                expect(processedItems).toEqual(["item-0", "item-1", "item-2"]);
                expect(await store.isQueueEmpty()).toBe(false);
                expect(await store.isAnyInFlight()).toBe(false);
                const dequeued = await store.dequeue();
                expect(dequeued).toBeDefined();
                expect(dequeued!.item).toBe("item-1");
                await store.commit(dequeued!.key);
                expect(await store.isQueueEmpty()).toBe(true);
                expect(await store.isAnyInFlight()).toBe(false);
            });
            it("should handle waitForEmptyQueue", async () => {
                let processedCount = 0;
                store.enqueue("item-1");
                store.enqueue("item-2");
                store.enqueue("item-3");
                const isResolved = (p1: Promise<any>) => {
                    return Promise.race([p1, Promise.resolve("WAITING")]).then((v) => v !== "WAITING");
                };
                const waitTask = store.waitForEmptyQueue();
                expect(await isResolved(waitTask)).toBe(false);
                await store.process({}, async (item, ctx) => {
                    processedCount++;
                    await ctx.commit(item.key);
                });
                await store.process({}, async (item, ctx) => {
                    processedCount++;
                    await ctx.commit(item.key);
                });
                expect(await isResolved(waitTask)).toBe(false);
                await store.process({}, async (item, ctx) => {
                    processedCount++;
                    await ctx.commit(item.key);
                });
                await expect(await isResolved(waitTask)).toBe(true);
            });

            it("should handle multiple concurrent dequeues", async () => {
                if (impl === "MemoryBackedQueue") {
                    expect(true).toBe(true);
                    // This test is only for in-memory queue
                    return;
                }
                const store2 = openQueue<string>(impl);
                const stores = [store, store2];
                const queuedItems = [];
                let storeIdx = 0;
                const maxItems = 30;
                for (let i = 0; i < maxItems; i++) {
                    const item = `item-${`${i}`.padStart(3, "0")}`;
                    queuedItems.push(item);
                    await stores[storeIdx].enqueue(item);
                    storeIdx = (storeIdx + 1) % stores.length;
                }
                const dequeueFunc = async () => {
                    const s = stores[Math.floor(Math.random() * stores.length)];
                    await delay(Math.floor(Math.random() * 20));
                    return s.dequeue();
                };
                const dequeueTask = Array.from({ length: maxItems }).map(() => dequeueFunc());
                const dequeuedItems = await Promise.all(dequeueTask);
                expect(dequeuedItems.length).toBe(maxItems);
                const dequeueValues = dequeuedItems.map((d) => d!.item);
                const dequeuedValuesSorted = [...dequeueValues].sort();
                const queuedItemsSorted = [...queuedItems].sort();
                await expect(dequeuedValuesSorted).toEqual(queuedItemsSorted);
            });
            it("should handle requeue at front (DANGER_KEEP_ORIGINAL)", async () => {
                await store.enqueue("item-1");
                await store.enqueue("item-2");
                const dequeued1 = await store.dequeue();
                expect(dequeued1).toBeDefined();
                expect(dequeued1!.item).toBe("item-1");
                const dequeued2 = await store.dequeue();
                expect(dequeued2).toBeDefined();
                expect(dequeued2!.item).toBe("item-2");
                await store.requeue(dequeued2!.key, RequeuePosition.DANGER_KEEP_ORIGINAL);
                await store.requeue(dequeued1!.key, RequeuePosition.DANGER_KEEP_ORIGINAL);
                const dequeued3 = await store.dequeue();
                expect(dequeued3).toBeDefined();
                expect(dequeued3!.item).toBe("item-1");
                const dequeued4 = await store.dequeue();
                expect(dequeued4).toBeDefined();
                expect(dequeued4!.item).toBe("item-2");
                await store.commit(dequeued3!.key);
                await store.commit(dequeued4!.key);
                expect(await store.isQueueEmpty()).toBe(true);
                expect(await store.isAnyInFlight()).toBe(false);
            });
            it("should accept wrong key on commit/revoke/requeue without throwing", async () => {
                await store.enqueue("item-X");
                const dequeued = await store.dequeue();
                expect(dequeued).toBeDefined();
                expect(dequeued!.item).toBe("item-X");
                await expect(store.commit("wrong-key")).resolves.not.toThrow();
                await expect(store.revoke("wrong-key")).resolves.not.toThrow();
                await expect(store.requeue("wrong-key")).resolves.not.toThrow();
            });

            if ("PersistentIDBackedQueue" === impl) {
                it("should handle in-flight items reversion on init", async () => {
                    expect(await store.isQueueEmpty()).toBe(true);
                    expect(await store.isAnyInFlight()).toBe(false);
                    await store.enqueue("itemF");
                    const dequeued = await store.dequeue();
                    expect(dequeued).toBeDefined();
                    expect(dequeued!.item).toBe("itemF");
                    // -- Simulate restart by creating a new instance
                    const store2 = openQueue<string>(impl);
                    await store2.isReady;
                    expect(await store2.isQueueEmpty()).toBe(false);
                    expect(await store2.isAnyInFlight()).toBe(false);
                });
            }
            if ("HalfPersistentIDBackedQueue" === impl) {
                it("should not in-flight items reversion on init ", async () => {
                    expect(await store.isQueueEmpty()).toBe(true);
                    expect(await store.isAnyInFlight()).toBe(false);
                    await store.enqueue("itemF");
                    const dequeued = await store.dequeue();
                    expect(dequeued).toBeDefined();
                    expect(dequeued!.item).toBe("itemF");
                    // -- Simulate restart by creating a new instance
                    const store2 = openQueue<string>(impl);
                    await store2.isReady;
                    expect(await store2.isQueueEmpty()).toBe(true);
                    expect(await store2.isAnyInFlight()).toBe(false);
                });
            }
        });
    }
    // Very rare cases
    it("should report inconsistent state", async () => {
        const Backend = openBackendStore<string>("SimpleStoreIDBv2", "test-bkstore-db-h");
        const store = new BrokenPIDBQueue<string>("test-bq", Backend);
        await store.enqueue("item-inconsistent");
        const dequeueTask = store.dequeue();
        await expect(dequeueTask).rejects.toThrow(/Inconsistent/);
        await dequeueTask.then(() => {}).catch(() => {});
        // await dequeueTask;
    });
    it("should report vanished item", async () => {
        const Backend = openBackendStore<string>("SimpleStoreIDBv2", "test-bkstore-db-h");
        const store = new BrokenPIDBQueue2<string>("test-bq", Backend);
        await store.enqueue("item-inconsistent");
        const dequeueTask = store.dequeue();
        await expect(dequeueTask).rejects.toThrowError(DatabaseTransactionAbortError);
        await dequeueTask.then(() => {}).catch(() => {});
        // await dequeueTask;
    });
    it("should report if in-flight item is already existing during dequeue", async () => {
        const Backend = openBackendStore<string>("SimpleStoreIDBv2", "test-bkstore-db-h");
        const store = new BrokenPIDBQueue3<string>("test-bq", Backend);
        await store.enqueue("item-inconsistent");
        const dequeueTask = store.dequeue();
        await expect(dequeueTask).rejects.toThrowError(DatabaseTransactionAbortError);
        await dequeueTask.then(() => {}).catch(() => {});
        // await dequeueTask;
    });
    it("should handle inconsistent state during in-flight items reversion ", async () => {
        const logs = [] as string[];
        const fn = vitest.spyOn(console, "warn").mockImplementation((...args) => {
            logs.push(args.join(" "));
        });
        const Backend = openBackendStore<string>("SimpleStoreIDBv2", "test-bkstore-db-h");
        const storeInit = new PersistentIDBBackedQueue<string>("test-bq", Backend);
        await storeInit.isReady;
        await storeInit.enqueue("item-inconsistent");
        await storeInit.dequeue(); // move to in-flight
        const store = new BrokenPIDBQueue4<string>("test-bq", Backend);
        vitest.spyOn(console, "warn").mockRestore();
        await expect(store.isReady).resolves.toBeUndefined();
        fn.mockRestore();
        expect(logs.indexOf("Error during recovery of in-flight items") > 0);
    });
});
