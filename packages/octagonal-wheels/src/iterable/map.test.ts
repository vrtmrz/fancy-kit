import { asyncMapWithConcurrency } from "./map";
import { describe, it, expect } from "vitest";
import { filter } from "./map";

describe("asyncMapWithConcurrency", () => {
    it("should process items with the given concurrency", async () => {
        const input = [1, 2, 3, 4, 5];
        const callback = async (n: number) => n * 2;
        const concurrency = 2;

        const result: number[] = [];
        for await (const item of asyncMapWithConcurrency(input, callback, concurrency)) {
            result.push(item);
        }

        expect(result).toEqual([2, 4, 6, 8, 10]);
    });

    it("should handle empty input", async () => {
        const input: number[] = [];
        const callback = async (n: number) => n * 2;
        const concurrency = 2;

        const result: number[] = [];
        for await (const item of asyncMapWithConcurrency(input, callback, concurrency)) {
            result.push(item);
        }

        expect(result).toEqual([]);
    });

    it("should handle concurrency of 1", async () => {
        const input = [1, 2, 3, 4, 5];
        const callback = async (n: number) => n * 2;
        const concurrency = 1;

        const result: number[] = [];
        for await (const item of asyncMapWithConcurrency(input, callback, concurrency)) {
            result.push(item);
        }

        expect(result).toEqual([2, 4, 6, 8, 10]);
    });

    it("should handle concurrency greater than input length", async () => {
        const input = [1, 2, 3];
        const callback = async (n: number) => n * 2;
        const concurrency = 5;

        const result: number[] = [];
        for await (const item of asyncMapWithConcurrency(input, callback, concurrency)) {
            result.push(item);
        }

        expect(result).toEqual([2, 4, 6]);
    });

    it("should handle async callback", async () => {
        const input = Array.from({ length: 70 }, (_, i) => i + 1);
        const expected = input.map((n) => n * 2);
        const callback = async (n: number) => {
            await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
            return n * 2;
        };
        const concurrency = 4;

        const result: number[] = [];
        for await (const item of asyncMapWithConcurrency(input, callback, concurrency)) {
            result.push(item);
        }

        expect(result).toEqual(expected);
    });

    it("should handle async generator callback", async () => {
        const input = Array.from({ length: 70 }, (_, i) => i + 1);
        const expected = input.map((n) => n * 2);
        let concurrencyCount = 0;
        let concurrencyMax = 0;
        const callback = async (n: number) => {
            try {
                concurrencyCount++;
                if (concurrencyCount > concurrencyMax) {
                    concurrencyMax = concurrencyCount;
                }
                await new Promise((resolve) => setTimeout(resolve, Math.random() * 100 + 10));
                return n * 2;
            } finally {
                concurrencyCount--;
            }
        };

        const inputGenerator = async function* () {
            for (const n of input) {
                await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
                yield n;
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
            yield 0;
        };

        const concurrency = 4;
        const result: number[] = [];
        for await (const item of asyncMapWithConcurrency(inputGenerator(), callback, concurrency)) {
            result.push(item);
        }
        expect(concurrencyMax).lessThanOrEqual(concurrency);

        expect(result).toEqual([...expected, 0]);
    });
});
describe("filter", () => {
    it("should filter items based on the callback", async () => {
        const input = [1, 2, 3, 4, 5];
        const callback = async (n: number) => n % 2 === 0;

        const result: number[] = [];
        for await (const item of filter(input, callback)) {
            result.push(item);
        }

        expect(result).toEqual([2, 4]);
    });

    it("should handle empty input", async () => {
        const input: number[] = [];
        const callback = async (n: number) => n % 2 === 0;

        const result: number[] = [];
        for await (const item of filter(input, callback)) {
            result.push(item);
        }

        expect(result).toEqual([]);
    });

    it("should handle synchronous callback", async () => {
        const input = [1, 2, 3, 4, 5];
        const callback = (n: number) => n % 2 === 0;

        const result: number[] = [];
        for await (const item of filter(input, callback)) {
            result.push(item);
        }

        expect(result).toEqual([2, 4]);
    });

    it("should handle async generator input", async () => {
        const input = async function* () {
            for (let i = 1; i <= 5; i++) {
                yield i;
            }
        };
        const callback = async (n: number) => n % 2 === 0;

        const result: number[] = [];
        for await (const item of filter(input(), callback)) {
            result.push(item);
        }

        expect(result).toEqual([2, 4]);
    });

    it("should handle mixed true/false callback results", async () => {
        const input = [1, 2, 3, 4, 5];
        const callback = async (n: number) => n > 3;

        const result: number[] = [];
        for await (const item of filter(input, callback)) {
            result.push(item);
        }

        expect(result).toEqual([4, 5]);
    });
});
