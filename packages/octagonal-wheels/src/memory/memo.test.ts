import { describe, it, expect, vi } from "vitest";
import { memoWithMap } from "./memo.ts";

describe("memoWithMap", () => {
    it("Returns the same Promise when the cache is hit", async () => {
        const fn = vi.fn(async (x: number) => x * 2);
        const memoed = memoWithMap(2, fn);

        const p1 = memoed(1);
        const p2 = memoed(1);

        expect(p1).toBe(p2);
        expect(await p1).toBe(2);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it("Returns a new Promise when the cache is missed", async () => {
        const fn = vi.fn(async (x: number) => x * 2);
        const memoed = memoWithMap(2, fn);

        const p1 = memoed(1);
        const p2 = memoed(2);

        expect(p1).not.toBe(p2);
        expect(await p1).toBe(2);
        expect(await p2).toBe(4);
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it("Evicts the least recently used entry when the buffer length is exceeded", async () => {
        const fn = vi.fn(async (x: number) => x * 2);
        const memoed = memoWithMap(2, fn);

        await memoed(1); // Cache: 1
        await memoed(2); // Cache: 1, 2
        await memoed(3); // Cache: 2, 3 (entry 1 is removed as the least recently used)

        // As entry 1 is no longer cached, it will be recalculated
        await memoed(1);
        expect(fn).toHaveBeenCalledTimes(4);
    });

    it("Removes the entry from the cache if the Promise is rejected", async () => {
        let count = 0;
        const fn = vi.fn(async (x: number) => {
            count++;
            if (count === 1) throw new Error("fail");
            return x * 2;
        });
        const memoed = memoWithMap(2, fn);

        await expect(memoed(1)).rejects.toThrow("fail");
        // As the first attempt failed, the value is not cached and will be recomputed on the next call
        expect(await memoed(1)).toBe(2);
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it("Uses the provided keyFunction when specified", async () => {
        const fn = vi.fn(async (x: number, y: number) => x + y);
        const keyFn = ([x, y]: [number, number]) => `${x}-${y}`;
        const memoed = memoWithMap(2, fn, keyFn);

        const p1 = memoed(1, 2);
        const p2 = memoed(1, 2);

        expect(p1).toBe(p2);
        expect(await p1).toBe(3);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it("Throws an error if bufferLength is zero or less", () => {
        const fn = async (x: number) => x;
        expect(() => memoWithMap(0, fn)).toThrow();
        expect(() => memoWithMap(-1, fn)).toThrow();
    });
});
