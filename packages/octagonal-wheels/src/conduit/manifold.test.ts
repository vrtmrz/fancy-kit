import { describe, it, expect, vi } from "vitest";
import { Manifold } from "./manifold.ts";

describe("Manifold", () => {
    it("add, remove, clear, set", async () => {
        const m = Manifold.of<[number]>("test1");
        const fn1 = vi.fn(async (n: number) => n > 0);
        const fn2 = vi.fn(async (n: number) => n < 0);

        m.add(fn1);
        m.add(fn2);
        expect(await m.some(1)).toBe(true);
        expect(fn1).toHaveBeenCalledWith(1);
        expect(fn2).not.toHaveBeenCalledWith(1);

        m.remove(fn1);
        expect(await m.some(-1)).toBe(true);
        expect(fn2).toHaveBeenCalledWith(-1);

        m.clear();
        expect(await m.some(1)).toBe(false);

        m.set(fn1);
        expect(await m.some(2)).toBe(true);
    });

    it("some returns true if any returns true, false if none", async () => {
        const m = Manifold.of<[number]>("test2");
        m.clear();
        m.add(async (n) => false);
        m.add(async (n) => n === 2);
        expect(await m.some(2)).toBe(true);
        expect(await m.some(1)).toBe(false);
    });

    it("any returns true if any returns true, true if empty", async () => {
        const m = Manifold.of<[number]>("test3");
        m.clear();
        expect(await m.any(1)).toBe(true);
        m.add(async (n) => false);
        m.add(async (n) => n === 3);
        expect(await m.any(3)).toBe(true);
        expect(await m.any(2)).toBe(false);
    });

    it("every returns true if all return true, true if empty", async () => {
        const m = Manifold.of<[number]>("test4");
        m.clear();
        expect(await m.every(1)).toBe(true);
        m.add(async (n) => true);
        m.add(async (n) => n > 0);
        expect(await m.every(2)).toBe(true);
        expect(await m.every(-1)).toBe(false);
    });

    it("all returns true if all return true, false if empty", async () => {
        const m = Manifold.of<[number]>("test5");
        m.clear();
        expect(await m.all(1)).toBe(false);
        m.add(async (n) => true);
        m.add(async (n) => n > 0);
        expect(await m.all(2)).toBe(true);
        expect(await m.all(-1)).toBe(false);
    });
    it("should get the same instance for the same name", () => {
        const m1 = Manifold.of<[number]>("shared");
        const m2 = Manifold.of<[number]>("shared");
        expect(m1).toBe(m2);
    });
    it("should not throw if no functions are set", async () => {
        const m = Manifold.of<[number]>("test6");
        expect(await m.some(1)).toBe(false);
        expect(await m.any(1)).toBe(true);
        expect(await m.every(1)).toBe(true);
        expect(await m.all(1)).toBe(false);
    });
    it("should handle errors in functions", async () => {
        const m = Manifold.of<[number]>("test7");
        const fn1 = vi.fn(async (n: number) => {
            throw new Error("error");
        });
        const fn2 = vi.fn(async (n: number) => n > 0);

        m.add(fn1);
        m.add(fn2);
        expect(await m.some(1)).toBe(true);
        expect(await m.any(1)).toBe(true);
        expect(await m.every(1)).toBe(false);
        expect(await m.all(1)).toBe(false);
    });
});
