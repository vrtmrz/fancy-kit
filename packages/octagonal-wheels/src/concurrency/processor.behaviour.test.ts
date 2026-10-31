import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promiseWithResolvers } from "../promises.ts";
import { QueueProcessor } from "./processor.ts";

describe("QueueProcessor behaviour", () => {
    const processors = new Set<{ terminate(): void }>();
    const releases = new Set<() => void>();

    function track<T, U>(processor: QueueProcessor<T, U>): QueueProcessor<T, U> {
        processors.add(processor);
        return processor;
    }

    function gate() {
        const deferred = promiseWithResolvers<void>();
        releases.add(deferred.resolve);
        return deferred;
    }

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(async () => {
        for (const release of releases) release();
        try {
            await vi.runAllTimersAsync();
        } finally {
            for (const processor of processors) processor.terminate();
            processors.clear();
            releases.clear();
            vi.useRealTimers();
        }
    });

    it("admits only the configured number of jobs and drains all accepted items", async () => {
        const started = [gate(), gate(), gate(), gate()];
        const finish = [gate(), gate(), gate(), gate()];
        const seen: number[] = [];
        const completed: number[] = [];
        let active = 0;
        let maximumActive = 0;
        const processor = track(
            new QueueProcessor<number, never>(
                async ([item]) => {
                    seen.push(item);
                    active++;
                    maximumActive = Math.max(maximumActive, active);
                    started[item - 1].resolve();
                    await finish[item - 1].promise;
                    completed.push(item);
                    active--;
                },
                { suspended: false, concurrentLimit: 2, batchSize: 1 }
            )
        );

        processor.enqueueAll([1, 2, 3, 4]);
        let drained = false;
        const done = processor.waitForAllProcessed().then((result) => {
            drained = true;
            return result;
        });
        await Promise.all([started[0].promise, started[1].promise]);
        expect(seen).toEqual([1, 2]);
        expect(drained).toBe(false);

        finish[0].resolve();
        await started[2].promise;
        expect(seen).toEqual([1, 2, 3]);
        finish[1].resolve();
        await started[3].promise;
        finish[2].resolve();
        finish[3].resolve();

        expect(await done).toBe(true);
        expect(maximumActive).toBe(2);
        expect(completed.sort()).toEqual([1, 2, 3, 4]);
        expect(processor.remaining).toBe(0);
        expect(processor.isIdle()).toBe(true);
    });

    it("preserves a follow-up for an active key while coalescing queued duplicates", async () => {
        const firstStarted = gate();
        const finishFirst = gate();
        const seen: string[] = [];
        const processor = track(
            new QueueProcessor<string, never>(
                async ([path]) => {
                    seen.push(path);
                    if (seen.length === 1) {
                        firstStarted.resolve();
                        await finishFirst.promise;
                        processor.enqueue(path);
                    }
                },
                { suspended: false, batchSize: 1, concurrentLimit: 1 },
                [],
                (queue, path) => [...queue.filter((entry) => entry !== path), path]
            )
        );

        processor.enqueue("note.md");
        await firstStarted.promise;
        processor.enqueue("note.md");
        processor.enqueue("note.md");
        processor.enqueue("other.md");
        const done = processor.waitForAllProcessed();
        finishFirst.resolve();

        expect(await done).toBe(true);
        expect(seen).toEqual(["note.md", "other.md", "note.md"]);
        expect(processor.totalRemaining).toBe(0);
    });

    it("waits for a slow downstream after the upstream has finished", async () => {
        const downstreamStarted = gate();
        const finishDownstream = gate();
        const upstreamFinished = gate();
        const output: number[] = [];
        let upstreamCount = 0;
        const downstream = track(
            new QueueProcessor<number, never>(
                async (items) => {
                    downstreamStarted.resolve();
                    await finishDownstream.promise;
                    output.push(...items);
                },
                { suspended: false, concurrentLimit: 1, batchSize: 1 }
            )
        );
        const upstream = track(
            new QueueProcessor<number, number>(
                (items) => {
                    upstreamCount += items.length;
                    if (upstreamCount === 2) upstreamFinished.resolve();
                    return items.map((item) => item * 10);
                },
                { suspended: false, concurrentLimit: 1, batchSize: 1 }
            )
        );
        upstream.pipeTo(downstream);
        upstream.enqueueAll([1, 2]);
        let drained = false;
        const done = upstream.waitForAllProcessed().then((result) => {
            drained = true;
            return result;
        });

        await Promise.all([downstreamStarted.promise, upstreamFinished.promise]);
        await vi.advanceTimersByTimeAsync(0);
        expect(upstream.nowProcessing).toBe(0);
        expect(upstream.isIdle()).toBe(false);
        expect(drained).toBe(false);
        expect(output).toEqual([]);
        finishDownstream.resolve();

        expect(await done).toBe(true);
        expect(output).toEqual([10, 20]);
        expect(upstream.totalRemaining).toBe(0);
    });

    it("can clear pending work in a suspended idle queue before resuming", async () => {
        const seen: number[] = [];
        const processor = track(
            new QueueProcessor<number, never>(
                (items) => {
                    seen.push(...items);
                },
                { suspended: false, concurrentLimit: 1, batchSize: 1 }
            )
        );

        processor.enqueue(1);
        expect(await processor.waitForAllProcessed()).toBe(true);
        processor.suspend();
        await vi.advanceTimersByTimeAsync(0);
        processor.enqueueAll([2, 3]);
        await vi.advanceTimersByTimeAsync(100);
        expect(seen).toEqual([1]);
        expect(processor.isSuspended).toBe(true);
        processor.clearQueue();
        processor.enqueue(4);
        processor.resume();
        await vi.advanceTimersByTimeAsync(0);

        expect(seen).toEqual([1, 4]);
        expect(await processor.waitForAllProcessed()).toBe(true);
        expect(processor.remaining).toBe(0);
    });

    it("terminates queued work while allowing an already started callback to settle", async () => {
        const started = gate();
        const finish = gate();
        const settled = gate();
        const seen: number[] = [];
        const completed: number[] = [];
        const processor = track(
            new QueueProcessor<number, never>(
                async ([item]) => {
                    seen.push(item);
                    started.resolve();
                    await finish.promise;
                    completed.push(item);
                    settled.resolve();
                },
                { suspended: false, concurrentLimit: 1, batchSize: 1 }
            )
        );
        processor.enqueueAll([1, 2, 3, 4]);
        await started.promise;

        processor.terminate();
        processor.enqueue(5);
        expect(completed).toEqual([]);
        finish.resolve();
        await settled.promise;
        await vi.advanceTimersByTimeAsync(0);

        expect(seen).toEqual([1]);
        expect(completed).toEqual([1]);
    });

    it("reports a drain timeout without cancelling the active job", async () => {
        const started = gate();
        const finish = gate();
        const completed: number[] = [];
        const processor = track(
            new QueueProcessor<number, never>(
                async ([item]) => {
                    started.resolve();
                    await finish.promise;
                    completed.push(item);
                },
                { suspended: false, concurrentLimit: 1, batchSize: 1 }
            )
        );
        processor.enqueue(1);
        await started.promise;
        let timedWaitSettled = false;
        const timedWait = processor.waitForAllDownstream(100).then((result) => {
            timedWaitSettled = true;
            return result;
        });
        await vi.advanceTimersByTimeAsync(99);
        expect(timedWaitSettled).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        expect(await timedWait).toBe(false);
        expect(completed).toEqual([]);

        finish.resolve();
        expect(await processor.waitForAllProcessed()).toBe(true);
        expect(completed).toEqual([1]);
    });

    it("delivers retained results when a downstream is connected later", async () => {
        const upstream = track(
            new QueueProcessor<number, number>((items) => items.map((item) => item * 10), {
                suspended: false,
                concurrentLimit: 1,
                batchSize: 1,
                keepResultUntilDownstreamConnected: true,
            })
        );
        upstream.enqueueAll([1, 2]);
        expect(await upstream.waitForAllProcessed()).toBe(true);
        const output: number[] = [];
        const downstream = track(
            new QueueProcessor<number, never>(
                (items) => {
                    output.push(...items);
                },
                { suspended: false, concurrentLimit: 1, batchSize: 1 }
            )
        );

        upstream.pipeTo(downstream);
        expect(await upstream.waitForAllProcessed()).toBe(true);
        expect(output).toEqual([10, 20]);
    });

    it("preserves item order and the final partial batch", async () => {
        const batches: number[][] = [];
        const processor = track(
            new QueueProcessor<number, never>(
                (items) => {
                    batches.push(items);
                },
                { suspended: false, concurrentLimit: 1, batchSize: 3 }
            )
        );
        processor.enqueueAll([1, 2, 3, 4, 5, 6, 7]);

        expect(await processor.waitForAllProcessed()).toBe(true);
        expect(batches).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    it("waits for the configured delay when the queue stays below its yield threshold", async () => {
        const batches: number[][] = [];
        const processor = track(
            new QueueProcessor<number, never>(
                (items) => {
                    batches.push(items);
                },
                { suspended: false, concurrentLimit: 1, batchSize: 3, yieldThreshold: 3, delay: 100 }
            )
        );
        processor.enqueue(1);

        await vi.advanceTimersByTimeAsync(99);
        expect(batches).toEqual([]);
        await vi.advanceTimersByTimeAsync(1);
        expect(await processor.waitForAllProcessed()).toBe(true);
        expect(batches).toEqual([[1]]);
    });
});
