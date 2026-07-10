import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Trench } from "./memutil.ts";
import { SimpleStoreIDB } from "../databases/SimpleStoreIDB.ts";
import { delay } from "../promises.ts";

describe("Trench", () => {
    let db: SimpleStoreIDB<any>;
    beforeEach(() => {
        db = new SimpleStoreIDB("test-trench");
    });
    afterEach(async () => {
        await delay(40);
        if (db.db !== undefined) {
            await db.destroy();
        }
    });
    it("should conceal and expose objects", async () => {
        const trench = new Trench(db);
        const obj = { name: "John Doe", age: 30 };
        const key = trench.conceal(obj);
        const exposedObj = await trench.expose(key);
        expect(exposedObj).toEqual(obj);
    });

    it("should bury concealed objects", async () => {
        const trench = new Trench(db);
        const obj = { name: "John Doe", age: 30 };
        const key = trench.conceal(obj);
        await trench.bury(key);
        const exposedObj = await trench.expose(key);
        expect(exposedObj).toBeUndefined();
    });

    it("should queue and dequeue objects", async () => {
        const trench = new Trench(db);
        const obj = { name: "John Doe", age: 30 };
        const key = "queueKey";
        await trench.queue(key, obj);
        const dequeuedObj = await trench.dequeue(key);
        expect(dequeuedObj).toEqual(obj);
    });

    it("should queue and dequeue objects with commit", async () => {
        const trench = new Trench(db);
        const obj = { name: "John Doe", age: 30 };
        const key = "queueKey";
        await trench.queue(key, obj);
        const dequeuedObj = await trench.dequeueWithCommit(key);
        const requeued = dequeuedObj?.value;
        expect(requeued).toEqual(obj);
        await dequeuedObj?.commit();
        const committedObj = await trench.dequeue(key);
        expect(committedObj).toBeUndefined();
    });

    it("should queue and dequeue objects with cancel", async () => {
        const trench = new Trench(db);
        const obj = { name: "John Doe", age: 30 };
        const key = "queueKey";
        await trench.queue(key, obj);
        const dequeuedObj = await trench.dequeueWithCommit(key);
        const requeued = dequeuedObj?.value;
        expect(requeued).toEqual(obj);
        await dequeuedObj?.cancel();
        const committedObj = await trench.dequeue(key);
        expect(committedObj).toEqual(obj);
    });

    it("should erase all ephemerals", async () => {
        const trench = new Trench(db);
        const obj1 = { name: "John Doe", age: 30 };
        const obj2 = { name: "Jane Smith", age: 25 };
        const key1 = trench.conceal(obj1);
        const key2 = trench.conceal(obj2);
        await trench.eraseAllEphemerals();
        const exposedObj1 = await trench.expose(key1);
        const exposedObj2 = await trench.expose(key2);
        expect(exposedObj1).toBeUndefined();
        expect(exposedObj2).toBeUndefined();
    });

    it("should erase all permanences", async () => {
        const trench = new Trench(db);
        const obj1 = { name: "John Doe", age: 30 };
        const obj2 = { name: "Jane Smith", age: 25 };
        const key1 = trench.conceal(obj1);
        const key2 = trench.conceal(obj2);
        await trench.queuePermanent("key3", { name: "John Doe", age: 30 });
        await trench.eraseAllPermanences();
        const exposedObj1 = await trench.expose(key1);
        const exposedObj2 = await trench.expose(key2);
        expect(exposedObj1).toEqual(obj1);
        expect(exposedObj2).toEqual(obj2);
        const dequeuedObj = await trench.dequeuePermanent("key3");
        expect(dequeuedObj).toBeUndefined();
    });
});
