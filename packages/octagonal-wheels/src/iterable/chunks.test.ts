import { describe, it, expect } from "vitest";
import { asChunk, asFlat } from "./chunks";
import { GeneratorSource } from "./source";
describe("asChunk", () => {
    it("should yield chunks of the specified unit size", async () => {
        const source = [1, 2, 3, 4, 5, 6];
        const unit = 2;
        const result: number[][] = [];
        for await (const chunk of asChunk(source, { unit })) {
            result.push([...chunk]);
        }
        expect(result).toEqual([
            [1, 2],
            [3, 4],
            [5, 6],
        ]);
    });

    it("should yield remaining items if they do not fill the unit size", async () => {
        const source = [1, 2, 3, 4, 5];
        const unit = 2;
        const result: number[][] = [];
        for await (const chunk of asChunk(source, { unit })) {
            result.push([...chunk]);
        }
        expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it("should yield chunks based to unit if timeout is not specified", async () => {
        const source = new GeneratorSource<number>();
        let cnt = 0;
        let i = setInterval(() => {
            source.enqueue(++cnt);
            if (cnt === 6) {
                source.dispose();
                clearInterval(i);
            }
        }, 50);
        const unit = 2;
        // const timeout = 100;
        const result: number[][] = [];
        for await (const chunk of asChunk(source, { unit })) {
            result.push([...chunk]);
        }
        expect(result).toEqual([
            [1, 2],
            [3, 4],
            [5, 6],
        ]);
    });

    it("should yield chunks are based on unit if having enough items before timeout", async () => {
        const source = new GeneratorSource<number>();
        let cnt = 0;
        let i = setInterval(() => {
            source.enqueue(++cnt);
            if (cnt === 6) {
                source.dispose();
                clearInterval(i);
            }
        }, 50);
        const unit = 2;
        const timeout = 500;
        const result: number[][] = [];
        for await (const chunk of asChunk(source, { unit, timeout })) {
            result.push([...chunk]);
        }
        source.dispose();
        expect(result).toEqual([
            [1, 2],
            [3, 4],
            [5, 6],
        ]);
    });

    it("Should chunks are smaller than the unit if timed out", async () => {
        const source = new GeneratorSource<number>();
        let cnt = 0;
        let i = setInterval(() => {
            source.enqueue(++cnt);
            if (cnt === 6) {
                source.dispose();
                clearInterval(i);
            }
        }, 50);
        const unit = 4;
        const timeout = 150;
        const result: number[][] = [];
        for await (const chunk of asChunk(source, { unit, timeout })) {
            result.push([...chunk]);
        }
        source.dispose();
        result.forEach((chunk, i) => {
            expect(chunk.length).toBeLessThanOrEqual(unit);
        });
    });
    it("Should keeping interval between chunks", async () => {
        const source = new GeneratorSource<number>();
        // const source = generativeBuffer<number>();
        let cnt = 0;
        let i = setInterval(() => {
            source.enqueue(++cnt);
            if (cnt === 70) {
                source.dispose();
                clearInterval(i);
            }
        }, 12);
        const unit = 4;
        // const timeout = 150;
        const interval = 100;
        const result: number[][] = [];
        let previous = Date.now();
        for await (const chunk of asChunk(source, { unit, interval })) {
            const now = Date.now();
            result.push([now, now - previous, ...chunk]);
            previous = now;
        }
        // source.dispose();
        result.forEach((chunk, i) => {
            expect(chunk.length).toBeLessThanOrEqual(unit + 2);
            if (i != chunk.length - 1 && i !== 0) {
                expect(chunk[1]).toBeGreaterThanOrEqual(interval);
            }
        });
    });
    it("should handle empty source", async () => {
        const source: number[] = [];
        const unit = 2;
        const result: number[][] = [];
        for await (const chunk of asChunk(source, { unit })) {
            result.push([...chunk]);
        }
        expect(result).toEqual([]);
    });
});
describe("asFlat", () => {
    it("should flatten nested async iterables", async () => {
        async function* generateNested() {
            yield [1, 2];
            yield [3, 4];
            yield [5, 6];
        }
        const source = generateNested();
        const result: number[] = [];
        for await (const item of asFlat(source)) {
            result.push(item);
        }
        expect(result).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it("should flatten nested sync iterables", async () => {
        async function* generateNested() {
            yield [1, 2];
            yield [3, 4];
            yield [5, 6];
        }
        const source = generateNested();
        const result: number[] = [];
        for await (const item of asFlat(source)) {
            result.push(item);
        }
        expect(result).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it("should handle mixed nested iterables", async () => {
        async function* generateNested() {
            yield [1, 2];
            yield (async function* () {
                yield 3;
                yield 4;
            })();
            yield [5, 6];
        }
        const source = generateNested();
        const result: number[] = [];
        for await (const item of asFlat(source)) {
            result.push(item);
        }
        expect(result).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it("should handle empty source", async () => {
        async function* generateNested() {
            // Empty generator
        }
        const source = generateNested();
        const result: number[] = [];
        for await (const item of asFlat<number>(source)) {
            result.push(item);
        }
        expect(result).toEqual([]);
    });
});
