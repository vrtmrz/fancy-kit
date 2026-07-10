import { describe, it, expect, vi } from "vitest";
import { weakMemo } from "./weakMemo.ts";

// Asynchronous function for testing

// Check if the global gc function exists.
// Throws an error if run without the --expose-gc flag.
if (!globalThis.gc) {
    throw new Error('Garbage Collection is not exposed. Run vitest with "--expose-gc" flag.');
}

/**
 * Triggers GC and waits for the FinalizationRegistry callback to execute.
 * Since GC behaviour is asynchronous and non-deterministic, a short wait is required.
 */
async function triggerGCAndWait() {
    // Call GC several times to increase the likelihood of collection.
    await new Promise((resolve) => setTimeout(resolve, 0));
    globalThis.gc?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    globalThis.gc?.();
}

describe("weakMemo", () => {
    it("should cache results for the same arguments", async () => {
        const asyncAdd = vi.fn(async (a: number, b: number) => {
            await new Promise((r) => setTimeout(r, 10));
            return a + b;
        });

        const memoized = weakMemo(asyncAdd);
        const p1 = memoized(1, 2);
        const p2 = memoized(1, 2);
        expect(p1).toBe(p2);
        const result = await p1;
        expect(result).toBe(3);
        expect(asyncAdd).toHaveBeenCalledTimes(1);
    });
    it("should use no-argument cache", async () => {
        let counter = 0;
        const asyncAdd = vi.fn(async () => {
            await new Promise((r) => setTimeout(r, 10));
            return ++counter;
        });

        const memoized = weakMemo(asyncAdd);
        const p1 = memoized();
        const p2 = memoized();
        expect(p1).toBe(p2);
        const result = await p1;
        expect(result).toBe(1);
        expect(asyncAdd).toHaveBeenCalledTimes(1);
    });
    it("should use complicated parameters", async () => {
        const asyncAdd = vi.fn(async (a: number, b: string, c: object, d: boolean, e: any) => {
            await new Promise((r) => setTimeout(r, 10));
            return `${a}-${b}-${JSON.stringify(c)}-${d}-${JSON.stringify(e)}`;
        });

        const memoized = weakMemo(asyncAdd);
        const p1 = memoized(1, "2", { key: "value" }, true, undefined);
        const p2 = memoized(1, "2", { key: "value" }, true, undefined);
        expect(p1).toBe(p2);
        const result = await p1;
        expect(result).toBe('1-2-{"key":"value"}-true-undefined');
        expect(asyncAdd).toHaveBeenCalledTimes(1);
    });

    it("should not cache results for different arguments", async () => {
        const asyncAdd = vi.fn(async (a: number, b: number) => {
            await new Promise((r) => setTimeout(r, 10));
            return a + b;
        });
        const memoized = weakMemo(asyncAdd);
        const p1 = memoized(2, 3);
        const p2 = memoized(3, 4);
        expect(p1).not.toBe(p2);
        expect(await p1).toBe(5);
        expect(await p2).toBe(7);
        expect(asyncAdd).toHaveBeenCalledTimes(2);
    });

    it("should remove cache entry if promise rejects", async () => {
        const errorFn = vi.fn(async (x: number) => {
            throw new Error("fail");
        });
        const memoized = weakMemo(errorFn);
        const p1 = memoized(1).catch(() => {});
        await p1;
        // When called again, a new Promise is created
        const p2 = memoized(1).catch(() => {});
        expect(p1).not.toBe(p2);
        expect(errorFn).toHaveBeenCalledTimes(2);
    });

    it("should use keyFunction if provided", async () => {
        const fn = vi.fn(async (x: number, y: number) => x * y);
        const keyFn = ([x, y]: [number, number]) => `${x}-${y}`;
        const memoized = weakMemo(fn, keyFn);
        const p1 = memoized(2, 4);
        const p2 = memoized(2, 4);
        const p3 = memoized(2, 9);
        expect(p1).toBe(p2);
        expect(p1).not.toBe(p3);
        expect(await p1).toBe(8);
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should recalculate if gc had run", async () => {
        const fn = vi.fn(async (x: number, y: number) => x * y);
        const keyFn = ([x, y]: [number, number]) => `${x}-${y}`;
        const memoized = weakMemo(fn, keyFn);
        const p1 = memoized(2, 4);
        const p2 = memoized(2, 4);
        expect(p1).toBe(p2);
        expect(await p1).toBe(8);
        expect(fn).toHaveBeenCalledTimes(1);

        await triggerGCAndWait();

        const p3 = memoized(2, 4);
        expect(p1).not.toBe(p3);
        expect(await p3).toBe(8);
        expect(fn).toHaveBeenCalledTimes(2);
    });
});
