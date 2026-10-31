import { afterEach, describe, it, expect, vi } from "vitest";
import { asChunk, asFlat } from "./chunks";
import { GeneratorSource } from "./source";
import { isResolved, promiseWithResolvers } from "../promises.ts";

afterEach(() => vi.useRealTimers());
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

    it("should flush the final partial batch when an async source completes", async () => {
        async function* source() {
            yield 1;
            yield 2;
            yield 3;
        }

        const result: number[][] = [];
        for await (const chunk of asChunk(source(), { unit: 2 })) {
            result.push([...chunk]);
        }

        expect(result).toEqual([[1, 2], [3]]);
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
    it("should wait for a full batch while a slow source remains open", async () => {
        const sourcePaused = promiseWithResolvers<void>();
        const releaseSource = promiseWithResolvers<void>();
        const sourceClosed = promiseWithResolvers<void>();
        let isSourceClosed = false;
        async function* source() {
            try {
                yield 1;
                sourcePaused.resolve();
                await releaseSource.promise;
                yield 2;
            } finally {
                isSourceClosed = true;
                sourceClosed.resolve();
            }
        }

        const iterator = asChunk(source(), { unit: 2 })[Symbol.asyncIterator]();
        const firstChunk = iterator.next();
        let completed = false;
        try {
            await sourcePaused.promise;
            expect(isSourceClosed).toBe(false);
            expect(await isResolved(firstChunk)).toBe(false);

            releaseSource.resolve();
            expect(await firstChunk).toEqual({ value: [1, 2], done: false });
            expect(await iterator.next()).toEqual({ value: undefined, done: true });
            completed = true;
        } finally {
            releaseSource.resolve();
            if (!completed) {
                await iterator.return?.();
            }
            await sourceClosed.promise;
        }
    });

    it("should flush a partial chunk after the timeout while the source remains open", async () => {
        vi.useFakeTimers();
        const timeout = 100;
        const sourcePaused = promiseWithResolvers<void>();
        const releaseSource = promiseWithResolvers<void>();
        const sourceClosed = promiseWithResolvers<void>();
        let isSourceClosed = false;
        async function* source() {
            try {
                yield "first";
                sourcePaused.resolve();
                await releaseSource.promise;
                yield "second";
            } finally {
                isSourceClosed = true;
                sourceClosed.resolve();
            }
        }

        const iterator = asChunk(source(), { unit: 3, timeout })[Symbol.asyncIterator]();
        const firstChunk = iterator.next();
        let completed = false;
        try {
            await sourcePaused.promise;
            await vi.advanceTimersByTimeAsync(0);
            await vi.advanceTimersByTimeAsync(timeout - 1);
            expect(await isResolved(firstChunk)).toBe(false);
            await vi.advanceTimersByTimeAsync(1);
            expect(await firstChunk).toEqual({ value: ["first"], done: false });
            expect(isSourceClosed).toBe(false);

            releaseSource.resolve();
            expect(await iterator.next()).toEqual({ value: ["second"], done: false });
            expect(await iterator.next()).toEqual({ value: undefined, done: true });
            completed = true;
        } finally {
            vi.useRealTimers();
            releaseSource.resolve();
            if (!completed) {
                try {
                    const first = await firstChunk;
                    if (!first.done) {
                        let result = await iterator.next();
                        while (!result.done) {
                            result = await iterator.next();
                        }
                    }
                } catch {
                    // Keep cleanup from masking the assertion which failed above.
                }
                await iterator.return?.();
            }
            await sourceClosed.promise;
        }
    });

    it("should gate chunks by the configured interval", async () => {
        vi.useFakeTimers();
        const interval = 100;
        const iterator = asChunk([1, 2, 3, 4], { unit: 2, interval })[Symbol.asyncIterator]();
        let secondChunk: Promise<IteratorResult<number[]>> | undefined;
        let completed = false;
        try {
            expect(await iterator.next()).toEqual({ value: [1, 2], done: false });
            secondChunk = iterator.next();
            await vi.advanceTimersByTimeAsync(0);
            expect(await isResolved(secondChunk)).toBe(false);
            await vi.advanceTimersByTimeAsync(interval - 1);
            expect(await isResolved(secondChunk)).toBe(false);
            await vi.runOnlyPendingTimersAsync();
            expect(await secondChunk).toEqual({ value: [3, 4], done: false });
            expect(await iterator.next()).toEqual({ value: undefined, done: true });
            completed = true;
        } finally {
            if (!completed) {
                await vi.runOnlyPendingTimersAsync();
                if (secondChunk) {
                    try {
                        const second = await secondChunk;
                        if (!second.done) {
                            await iterator.next();
                        }
                    } catch {
                        // Keep cleanup from masking the assertion which failed above.
                    }
                }
                await iterator.return?.();
            }
            vi.useRealTimers();
        }
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
