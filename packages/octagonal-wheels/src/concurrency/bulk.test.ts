import { describe, it, expect, vi } from "vitest";
import { WaitSemaphore, Batcher, BatcherWithTimeout, Streamer } from "./bulk";

// WaitSemaphore
describe("WaitSemaphore", () => {
    it("should be free initially and lock/free correctly", async () => {
        const ws = new WaitSemaphore();
        expect(ws.isFree).toBe(true);
        ws.lock();
        expect(ws.isFree).toBe(false);
        ws.free();
        expect(ws.isFree).toBe(true);
    });

    it("should resolve nextFree when freed", async () => {
        const ws = new WaitSemaphore();
        ws.lock();
        let resolved = false;
        ws.nextFree.then(() => {
            resolved = true;
        });
        ws.free();
        await Promise.resolve();
        expect(resolved).toBe(true);
    });

    it("should reject nextFree on abort", async () => {
        const ac = new AbortController();
        const ws = new WaitSemaphore(ac);
        ws.lock();
        const p = ws.nextFree;
        ac.abort();
        await expect(p).rejects.toThrow("Aborted");
    });
});

// Batcher
describe("Batcher", () => {
    it("should batch items and yield them", async () => {
        const batcher = new Batcher<number>({ batchSize: 2 });
        await batcher.add(1);
        await batcher.add(2);
        const gen = batcher.yield();
        const { value, done } = await gen.next();
        expect(value).toEqual([1, 2]);
        expect(done).toBe(false);
    });

    it("should respect capacity", async () => {
        const batcher = new Batcher<number>({ batchSize: 2, capacity: 2 });
        await batcher.add(1);
        await batcher.add(2);
        let blocked = false;
        const p = batcher.add(3).then(() => {
            blocked = true;
        });
        // Should not resolve immediately
        await Promise.resolve();
        expect(blocked).toBe(false);
        batcher["buffer"].splice(0, 2); // manually clear buffer
        batcher["freeFlag"].free();
        await p;
        expect(blocked).toBe(true);
    });
});

// BatcherWithTimeout
describe("BatcherWithTimeout", () => {
    it("should yield batch after timeout from last add", async () => {
        // vi.useFakeTimers();
        const batcher = new BatcherWithTimeout<number>({ batchSize: 3, timeoutFromLastAdd: 100 });
        await batcher.add(1);
        await new Promise((res) => setTimeout(res, 10));
        await batcher.add(2);
        const gen = batcher.yield();
        const r = gen.next();
        const resolved = await Promise.race([r, Promise.resolve(undefined)]);
        expect(resolved).toBe(undefined); // should not have yielded yet
        await new Promise((res) => setTimeout(res, 120));
        // await r;
        const resolved2 = await Promise.race([r, Promise.resolve(undefined)]);
        expect(resolved2).not.toBe(undefined);
        if (resolved2 !== undefined) {
            expect(resolved2.value).toEqual([1, 2]);
        }
        await batcher.add(3);
        await batcher.add(4);
        await batcher.add(5);
        const yielded3 = gen.next(); // yield second batch
        const resolved3 = await Promise.race([yielded3, Promise.resolve(undefined)]);
        // May the microtask queue be starved, so may not have yielded yet
        expect(resolved3).toBe(undefined);
        await new Promise((res) => setTimeout(res, 20));
        const resolved4 = await Promise.race([yielded3, Promise.resolve(undefined)]);
        // should have yielded immediately since batch size reached
        await new Promise((res) => setTimeout(res, 50));
        expect(resolved4).not.toBe(undefined);
        if (resolved4 !== undefined) {
            expect(resolved4.value).toEqual([3, 4, 5]);
        }
        // vi.advanceTimersByTime(1);
        // vi.useRealTimers();
    });

    it("should yield batch after timeout from last yield", async () => {
        // vi.useFakeTimers();
        const batcher = new BatcherWithTimeout<number>({ batchSize: 3, timeoutFromLastYield: 100 });
        await batcher.add(1);
        await new Promise((res) => setTimeout(res, 10));
        await batcher.add(2);
        const gen = batcher.yield();
        await new Promise((res) => setTimeout(res, 10));
        const r1 = gen.next();
        const resolved1 = await Promise.race([r1, Promise.resolve(undefined)]);
        expect(resolved1).toBe(undefined); // should not have yielded yet
        await new Promise((res) => setTimeout(res, 200));
        const resolved2 = await Promise.race([r1, Promise.resolve(undefined)]);
        expect(resolved2).toBe(undefined); // Also should not have yielded, due to timeoutFromLastAdd not set
        await batcher.add(3);
        await new Promise((res) => setTimeout(res, 10));
        const resolved2_b = await Promise.race([r1, Promise.resolve(undefined)]);
        expect(resolved2_b).not.toBe(undefined);
        if (resolved2_b !== undefined) {
            expect(resolved2_b.value).toEqual([1, 2, 3]);
        }

        await batcher.add(4);
        // await batcher.add(4);
        // await batcher.add(5);
        const r2 = gen.next(); // yield second batch
        const resolved3 = await Promise.race([r2, Promise.resolve(undefined)]);
        expect(resolved3).toBe(undefined); // should not have yielded yet
        await new Promise((res) => setTimeout(res, 120)); // use real timers here
        const resolved4 = await Promise.race([r2, Promise.resolve(undefined)]);
        expect(resolved4).not.toBe(undefined);
        if (resolved4 !== undefined) {
            expect(resolved4.value).toEqual([4]);
        }
        // vi.useRealTimers();
    });
    it("should abort correctly by AbortController", async () => {
        const ac = new AbortController();
        const batcher = new BatcherWithTimeout<number>({ batchSize: 3, timeoutFromLastYield: 100 }, ac);
        await batcher.add(1);
        await batcher.add(2);
        const gen = batcher.yield();
        const r1 = gen.next();
        ac.abort();
        expect((await r1).value).toEqual([1, 2]);
    });

    it("should abort correctly by method", async () => {
        const ac = new AbortController();
        const batcher = new BatcherWithTimeout<number>({ batchSize: 3, timeoutFromLastYield: 100 }, ac);
        await batcher.add(1);
        await batcher.add(2);
        const gen = batcher.yield();
        const r1 = gen.next();
        batcher.abort();
        expect((await r1).value).toEqual([1, 2]);
    });
    it("should disable/enable control correctly", async () => {
        const batcher = new Batcher<number>({ batchSize: 3 });
        await batcher.add(1);
        await batcher.add(2);
        batcher.disableControl();
        const gen = batcher.yield();
        // Should not blocked by disableControl
        const r1 = gen.next();
        await new Promise((res) => setTimeout(res, 10));
        const resolved1 = await Promise.race([r1, Promise.resolve(undefined)]);
        expect(resolved1).not.toBe(undefined);
        if (resolved1 !== undefined) {
            expect(resolved1.value).toEqual([1, 2]);
        }
        batcher.enableControl();
        await batcher.add(3);
        const r2 = gen.next();
        await new Promise((res) => setTimeout(res, 10));
        const resolved2 = await Promise.race([r2, Promise.resolve(undefined)]);
        expect(resolved2).toBe(undefined);
        await batcher.add(4);
        await batcher.add(5);
        await new Promise((res) => setTimeout(res, 10));
        const resolved3 = await Promise.race([r2, Promise.resolve(undefined)]);
        expect(resolved3).not.toBe(undefined);
        if (resolved3 !== undefined) {
            expect(resolved3.value).toEqual([3, 4, 5]);
        }
    });
});

// Streamer
describe("Streamer", () => {
    it("should yield items from arrays in order", async () => {
        const streamer = new Streamer<number>({});
        await streamer.add([1, 2]);
        await streamer.add([]);
        await streamer.add([3]);
        await streamer.add([]);
        const gen = streamer.yield();
        expect((await gen.next()).value).toBe(1);
        expect((await gen.next()).value).toBe(2);
        expect((await gen.next()).value).toBe(3);
    });

    it("should throw if buffer is empty (should not happen)", async () => {
        const streamer = new Streamer<number>({});
        const gen = streamer.yield();
        await expect(gen.next()).rejects.toThrow();
    });
});
