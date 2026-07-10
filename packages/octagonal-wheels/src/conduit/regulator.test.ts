import { describe, it, expect, vi } from "vitest";
import { Regulator } from "./regulator.ts";
import { delay } from "../promises.ts";

describe("Regulator", () => {
    it("should process items with default concurrency (1)", async () => {
        const processed: number[] = [];
        const reg = Regulator.of<[number], number>("test1").onProcess(async (n) => {
            processed.push(n);
            return n * 2;
        });

        const results = await Promise.all([reg.invoke(1), reg.invoke(2), reg.invoke(3)]);
        expect(results).toEqual([2, 4, 6]);
        expect(processed).toEqual([1, 2, 3]);
    });

    it("should respect maxConcurrency", async () => {
        let concurrency = 0;
        let maxConcurrency = 0;
        const order: number[] = [];
        const reg = Regulator.of<[number], number>("test2")
            .maxConcurrency(2)
            .onProcess(async (n) => {
                try {
                    concurrency++;
                    maxConcurrency = Math.max(maxConcurrency, concurrency);
                    order.push(n);
                    await new Promise((res) => setTimeout(res, 10));
                    return n * 3;
                } finally {
                    concurrency--;
                }
            });

        const promises = [reg.invoke(1), reg.invoke(2), reg.invoke(3), reg.invoke(4)];
        const results = await Promise.all(promises);
        expect(results).toEqual([3, 6, 9, 12]);
        expect(order).toEqual([1, 2, 3, 4]);
        expect(maxConcurrency).toBe(2);
    });

    it("should not resolved during max concurrency 0", async () => {
        const reg = Regulator.of<[number], number>("test3")
            .maxConcurrency(0)
            .onProcess(async (n) => n);
        const p = reg.invoke(1);
        const x = Promise.race([p, new Promise<number>((res) => setTimeout(() => res(Number.MAX_SAFE_INTEGER), 100))]);
        expect(await x).toBe(Number.MAX_SAFE_INTEGER);
        reg.maxConcurrency(1);

        // const p = expect(reg.invoke(1)).rejects.toThrow();
    });

    it("should reject if onProcess throws", async () => {
        const reg = Regulator.of<[number], number>("test4").onProcess(async () => {
            throw new Error("fail");
        });

        await expect(reg.invoke(42)).rejects.toThrow("fail");
    });

    it("should reuse the same regulator for the same name", () => {
        const reg1 = Regulator.of<[number], number>("shared");
        const reg2 = Regulator.of<[number], number>("shared");
        expect(reg1).toBe(reg2);
    });

    it("should allow chaining of maxConcurrency and onProcess", () => {
        const reg = Regulator.of<[number], number>("chain")
            .maxConcurrency(2)
            .onProcess(async (n) => n);
        expect(typeof reg.invoke).toBe("function");
    });
    it("should throw if no function is set on onProcess", async () => {
        const reg = Regulator.of<[number], number>("noFunctionXXX");
        const w = reg.invoke(1);
        await expect(w).rejects.toThrow();
    });
    // TODO: Add more tests for edge cases and error handling
    // Keep max concurrency with different regulators with the same name
    it("should keep max concurrency with different regulators with the same name", async () => {
        let concurrency = 0;
        let maxConcurrency = 0;

        const reg1 = Regulator.of<[number], number>("test5")
            .maxConcurrency(2)
            .onProcess(async (n) => {
                try {
                    concurrency++;
                    maxConcurrency = Math.max(maxConcurrency, concurrency);
                    const timeout = Math.floor(Math.random() * 100) + 20;
                    await new Promise((res) => setTimeout(res, timeout));
                    return n * 3;
                } finally {
                    concurrency--;
                }
            });
        const reg2 = Regulator.of<[number], number>("test5");
        expect(reg1).toBe(reg2);
        reg1.invokeAll([[1], [2], [3], [4]]);
        expect(maxConcurrency).toBe(2);
    });
    it("should allow invoke by array items", async () => {
        const results: number[] = [];
        const reg = Regulator.of<[number], number>("test6").onProcess(async (n) => {
            results.push(n);
            return n * 4;
        });

        const promises = reg.invokeAll([[1], [2], [3]]);
        const finalResults = await Promise.all(promises);
        expect(finalResults).toEqual([4, 8, 12]);
        expect(results).toEqual([1, 2, 3]);
    });
    it("should handle edge cases", async () => {
        const reg = Regulator.of<[number], number>("test7")
            .onProcess(async (n) => n)
            .onProcess(async (n) => new Promise((res) => setTimeout(() => res(n * 2), 100)))
            .maxConcurrency(1);

        const p = reg.invokeAll([[1], [2], [3]]);
        reg.maxConcurrency(0);
        await delay(150);
        reg.maxConcurrency(1);
        await delay(100);
        const result = await Promise.all(p);
        expect(result).toEqual([2, 4, 6]);
        reg.onProcess(async (n) => n);
    });
});
