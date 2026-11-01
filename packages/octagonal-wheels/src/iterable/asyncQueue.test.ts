import { describe, expect, it, vi } from "vitest";
import { withCancellation } from "../concurrency/cancellation.ts";
import { forEachInScope } from "../concurrency/scoped.iteration.ts";
import { createOwnedResource, withOwnedResource } from "../resource.ts";
import { createAsyncQueue } from "./asyncQueue.ts";

describe("createAsyncQueue", () => {
    it("preserves FIFO order and drains values after finish", async () => {
        const queue = createAsyncQueue<number>();
        queue.enqueue(1);
        queue.enqueue(2);
        queue.enqueue(3);
        expect(queue.size).toBe(3);

        queue.finish();
        const values: number[] = [];
        for await (const value of queue) values.push(value);

        expect(values).toEqual([1, 2, 3]);
        expect(queue.size).toBe(0);
        expect(() => queue.enqueue(4)).toThrow(/finished or been disposed/);
    });

    it("preserves FIFO order through ring wrap and growth after partial consumption", async () => {
        const queue = createAsyncQueue<number | undefined>();
        for (let value = 0; value < 8; value++) queue.enqueue(value);
        const iterator = queue[Symbol.asyncIterator]();
        const consumed: (number | undefined)[] = [];

        for (let index = 0; index < 5; index++) {
            const result = await iterator.next();
            expect(result.done).toBe(false);
            consumed.push(result.value);
        }

        const appended = [8, 9, undefined, 11, 12, 13, 14, 15, 16, 17];
        for (const value of appended) queue.enqueue(value);
        queue.finish();

        const remaining: (number | undefined)[] = [];
        let sawUndefinedItem = false;
        for (;;) {
            const result = await iterator.next();
            if (result.done) break;
            remaining.push(result.value);
            if (result.value === undefined) {
                sawUndefinedItem = true;
                expect(result).toEqual({ done: false, value: undefined });
            }
        }

        expect(consumed).toEqual([0, 1, 2, 3, 4]);
        expect(remaining).toEqual([5, 6, 7, ...appended]);
        expect(sawUndefinedItem).toBe(true);
        expect(queue.size).toBe(0);
    });

    it("disposes buffered values before a reader starts", async () => {
        const queue = createAsyncQueue<object>();
        queue.enqueue({});
        queue.enqueue({});
        queue.dispose();

        expect(queue.size).toBe(0);
        const iterator = queue[Symbol.asyncIterator]();
        await expect(iterator.next()).resolves.toEqual({ done: true, value: undefined });
    });

    it("returns independent completion records for separate queues", async () => {
        const firstQueue = createAsyncQueue<number>();
        const secondQueue = createAsyncQueue<number>();
        firstQueue.finish();
        secondQueue.finish();

        const firstResult = await firstQueue[Symbol.asyncIterator]().next();
        const secondResult = await secondQueue[Symbol.asyncIterator]().next();

        expect(firstResult).not.toBe(secondResult);
        Object.assign(firstResult, { value: 42 });
        expect(secondResult).toEqual({ done: true, value: undefined });
    });

    it("wakes an empty pending read as done when disposed", async () => {
        const queue = createAsyncQueue<number>();
        const iterator = queue[Symbol.asyncIterator]();
        const pending = iterator.next();

        queue.dispose();

        await expect(pending).resolves.toEqual({ done: true, value: undefined });
        expect(queue.size).toBe(0);
    });

    it("wakes an empty pending read when finished", async () => {
        const queue = createAsyncQueue<number>();
        const iterator = queue[Symbol.asyncIterator]();
        const pending = iterator.next();

        queue.finish();

        await expect(pending).resolves.toEqual({ done: true, value: undefined });
        expect(queue.size).toBe(0);
        expect(() => queue.enqueue(1)).toThrow(/finished or been disposed/);
    });

    it("keeps a value claimed by a waiting read when disposal follows enqueue", async () => {
        const queue = createAsyncQueue<string>();
        const iterator = queue[Symbol.asyncIterator]();
        const pending = iterator.next();

        queue.enqueue("claimed");
        queue.dispose();

        await expect(pending).resolves.toEqual({ done: false, value: "claimed" });
        expect(queue.size).toBe(0);
    });

    it("lets finish drain buffered values, then lets dispose discard the remainder", async () => {
        const queue = createAsyncQueue<number>();
        queue.enqueue(1);
        queue.enqueue(2);
        queue.finish();
        queue.finish();
        expect(queue.size).toBe(2);

        queue.dispose();
        queue.dispose();

        expect(queue.size).toBe(0);
        await expect(queue[Symbol.asyncIterator]().next()).resolves.toEqual({ done: true, value: undefined });
        expect(() => queue.enqueue(3)).toThrow(/finished or been disposed/);
    });

    it("disposes when the iterator is returned", async () => {
        const queue = createAsyncQueue<number>();
        queue.enqueue(1);
        const iterator = queue[Symbol.asyncIterator]();

        await expect(iterator.return?.()).resolves.toEqual({ done: true, value: undefined });
        expect(queue.size).toBe(0);
        await expect(iterator.next()).resolves.toEqual({ done: true, value: undefined });
    });

    it("rejects a second iterator acquisition", () => {
        const queue = createAsyncQueue<number>();
        queue[Symbol.asyncIterator]();

        expect(() => queue[Symbol.asyncIterator]()).toThrow(/only one iterator/);
    });

    it("rejects overlapping pending reads without replacing the first", async () => {
        const queue = createAsyncQueue<number>();
        const iterator = queue[Symbol.asyncIterator]();
        const first = iterator.next();

        await expect(iterator.next()).rejects.toThrow(/only one pending next/);
        queue.enqueue(7);

        await expect(first).resolves.toEqual({ done: false, value: 7 });
    });

    it("returns undefined and promise-valued items without losing their identity", async () => {
        const promiseItem = Promise.resolve("value");
        const queue = createAsyncQueue<unknown>();
        queue.enqueue(undefined);
        queue.enqueue(promiseItem);
        queue.finish();
        const iterator = queue[Symbol.asyncIterator]();

        const undefinedResult = await iterator.next();
        const promiseResult = await iterator.next();

        expect(undefinedResult).toEqual({ done: false, value: undefined });
        expect(promiseResult.done).toBe(false);
        expect(promiseResult.value).toBe(promiseItem);
    });

    it("cleans up through withOwnedResource when the operation throws", async () => {
        const queue = createAsyncQueue<number>();
        const failure = new Error("operation failed");

        await expect(
            withOwnedResource(queue, (owned) => {
                owned.enqueue(1);
                throw failure;
            })
        ).rejects.toBe(failure);

        expect(queue.size).toBe(0);
        expect(() => queue.enqueue(2)).toThrow(/finished or been disposed/);
    });

    it("disposes an empty pending read on cancellation and still runs owned cleanup", async () => {
        const controller = new AbortController();
        const queue = createAsyncQueue<number>();
        const release = vi.fn((owned: typeof queue) => owned.dispose());
        const owner = createOwnedResource(queue, release);
        const queueIterator = queue[Symbol.asyncIterator]();
        let markReadStarted!: () => void;
        const readStarted = new Promise<void>((resolve) => {
            markReadStarted = resolve;
        });
        const input: AsyncIterable<number> = {
            [Symbol.asyncIterator]() {
                return {
                    next() {
                        const pending = queueIterator.next();
                        markReadStarted();
                        return pending;
                    },
                    return() {
                        return queueIterator.return!();
                    },
                };
            },
        };
        const seen: number[] = [];

        const operation = withOwnedResource(owner, (owned) =>
            withCancellation(undefined, { signal: controller.signal }, (parent) => {
                const disposeOnAbort = () => owned.value.dispose();
                parent.signal.addEventListener("abort", disposeOnAbort, { once: true });
                parent.defer(() => parent.signal.removeEventListener("abort", disposeOnAbort));
                return forEachInScope(parent, input, {}, (item) => {
                    seen.push(item);
                });
            })
        );

        await readStarted;
        controller.abort();
        const result = await operation;

        expect(result).toEqual({ status: "cancelled", started: 0 });
        expect(seen).toEqual([]);
        expect(release).toHaveBeenCalledExactlyOnceWith(queue);
        expect(queue.size).toBe(0);
        expect(() => queue.enqueue(1)).toThrow(/finished or been disposed/);
    });

    it("disposes buffered input when the cancellation signal is already aborted", async () => {
        const controller = new AbortController();
        controller.abort();
        const queue = createAsyncQueue<number>();
        queue.enqueue(1);
        const seen: number[] = [];

        const result = await withCancellation(undefined, { signal: controller.signal }, (parent) => {
            const disposeOnAbort = () => queue.dispose();
            parent.signal.addEventListener("abort", disposeOnAbort, { once: true });
            if (parent.signal.aborted) disposeOnAbort();
            parent.defer(() => parent.signal.removeEventListener("abort", disposeOnAbort));
            return forEachInScope(parent, queue, {}, (item) => {
                seen.push(item);
            });
        });

        expect(result).toEqual({ status: "cancelled", started: 0 });
        expect(seen).toEqual([]);
        expect(queue.size).toBe(0);
    });

    it("composes with cancellation-aware scoped iteration", async () => {
        const controller = new AbortController();
        const queue = createAsyncQueue<number>();
        queue.enqueue(1);
        queue.enqueue(2);
        const seen: number[] = [];

        const result = await withCancellation(undefined, { signal: controller.signal }, (parent) => {
            parent.defer(() => queue.dispose());
            return forEachInScope(parent, queue, {}, (item) => {
                seen.push(item);
                controller.abort();
            });
        });

        expect(result).toEqual({ status: "cancelled", started: 1 });
        expect(seen).toEqual([1]);
        expect(queue.size).toBe(0);
    });
});
