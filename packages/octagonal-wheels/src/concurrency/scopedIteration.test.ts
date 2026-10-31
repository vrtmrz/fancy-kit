import { describe, expect, it, vi } from "vitest";
import { withCancellation } from "./cancellation.ts";
import { forEachInScope, mapInScope } from "./scoped.iteration.ts";
import * as compatibilityIteration from "./scopedIteration.ts";
import { withScope } from "../resource/scope.ts";

function gate<T = void>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

function iterableWithClose<T>(values: readonly T[], onClose: () => void): Iterable<T> {
    let index = 0;
    const iterator: Iterator<T> = {
        next() {
            if (index >= values.length) return { done: true, value: undefined };
            return { done: false, value: values[index++]! };
        },
        return() {
            onClose();
            return { done: true, value: undefined };
        },
    };
    return {
        [Symbol.iterator]() {
            return iterator;
        },
    };
}

describe("scoped iteration", () => {
    it("keeps the previous module path as a public re-export", () => {
        expect(compatibilityIteration.forEachInScope).toBe(forEachInScope);
        expect(compatibilityIteration.mapInScope).toBe(mapInScope);
    });

    it("defaults to sequential dispatch and holds its slot until cleanup settles", async () => {
        const bodyStarted = gate();
        const finishBody = gate();
        const cleanupStarted = gate();
        const finishCleanup = gate();
        const secondStarted = gate();
        const dispatched: number[] = [];
        let active = 0;
        let maximum = 0;

        const pending = withScope("shared", (parent) =>
            forEachInScope(parent, [0, 1], {}, async (_item, ctx, index) => {
                dispatched.push(index);
                active++;
                maximum = Math.max(maximum, active);
                ctx.defer(async () => {
                    if (index === 0) {
                        cleanupStarted.resolve();
                        await finishCleanup.promise;
                    }
                    active--;
                });
                if (index === 0) {
                    bodyStarted.resolve();
                    await finishBody.promise;
                } else {
                    secondStarted.resolve();
                }
            })
        );

        await bodyStarted.promise;
        expect(dispatched).toEqual([0]);
        expect(active).toBe(1);

        finishBody.resolve();
        await cleanupStarted.promise;
        expect(dispatched).toEqual([0]);
        expect(active).toBe(1);

        finishCleanup.resolve();
        await secondStarted.promise;
        await expect(pending).resolves.toEqual({ status: "completed", started: 2 });
        expect(dispatched).toEqual([0, 1]);
        expect(maximum).toBe(1);
        expect(active).toBe(0);
    });

    it("bounds concurrency through cleanup and runs parent cleanup after every child", async () => {
        const cleanupStarted = Array.from({ length: 3 }, () => gate());
        const finishCleanup = Array.from({ length: 3 }, () => gate());
        const cleanupFinished = Array.from({ length: 3 }, () => gate());
        const started: number[] = [];
        const cleaned: number[] = [];
        let active = 0;
        let maximum = 0;
        let parentClosed = false;

        const pending = withScope("shared", (parent) => {
            parent.defer(() => {
                parentClosed = true;
                expect(active).toBe(0);
                expect(cleaned).toEqual([0, 1, 2]);
            });
            return forEachInScope(parent, [0, 1, 2], { concurrency: 2 }, async (_item, ctx, index) => {
                started.push(index);
                active++;
                maximum = Math.max(maximum, active);
                ctx.defer(async () => {
                    cleanupStarted[index]!.resolve();
                    await finishCleanup[index]!.promise;
                    active--;
                    cleaned.push(index);
                    cleanupFinished[index]!.resolve();
                });
            });
        });

        await Promise.all([cleanupStarted[0]!.promise, cleanupStarted[1]!.promise]);
        expect(started).toEqual([0, 1]);
        expect(active).toBe(2);
        expect(parentClosed).toBe(false);

        finishCleanup[0]!.resolve();
        await cleanupFinished[0]!.promise;
        await cleanupStarted[2]!.promise;
        expect(started).toEqual([0, 1, 2]);
        expect(active).toBe(2);
        expect(maximum).toBe(2);
        expect(parentClosed).toBe(false);

        finishCleanup[1]!.resolve();
        await cleanupFinished[1]!.promise;
        finishCleanup[2]!.resolve();
        await cleanupFinished[2]!.promise;

        await expect(pending).resolves.toEqual({ status: "completed", started: 3 });
        expect(parentClosed).toBe(true);
        expect(cleaned).toEqual([0, 1, 2]);
        expect(maximum).toBe(2);
    });

    it("isolates item cleanup while sharing the parent value and cancellation capability", async () => {
        const parentController = new AbortController();
        const sharedValue = { name: "shared" };
        const contexts: object[] = [];
        const trace: string[] = [];

        const result = await withCancellation(sharedValue, { signal: parentController.signal }, (parent) => {
            parent.defer(() => {
                trace.push("parent cleanup");
            });
            return forEachInScope(parent, ["first", "second"], {}, async (item, child) => {
                contexts.push(child);
                expect(child.value).toBe(sharedValue);
                expect(child.signal).toBe(parent.signal);
                expect(child.isCancelled).toBe(parent.isCancelled);
                expect(child.isCancelled()).toBe(false);
                trace.push("body " + item);
                child.defer(() => {
                    trace.push("cleanup " + item);
                });
            });
        });

        expect(result).toEqual({ status: "completed", started: 2 });
        expect(contexts).toHaveLength(2);
        expect(contexts[0]).not.toBe(contexts[1]);
        expect(trace).toEqual(["body first", "cleanup first", "body second", "cleanup second", "parent cleanup"]);
        expect(parentController.signal.aborted).toBe(false);
    });

    it("returns mapped values in input order, including undefined, after out-of-order completion", async () => {
        const started = Array.from({ length: 4 }, () => gate());
        const finishBody = Array.from({ length: 4 }, () => gate());
        const bodyFinished = Array.from({ length: 4 }, () => gate());
        const completionOrder: number[] = [];

        const pending = withScope("shared", (parent) =>
            mapInScope(parent, [0, 1, 2, 3], { concurrency: 3 }, async (_item, _ctx, index) => {
                started[index]!.resolve();
                await finishBody[index]!.promise;
                completionOrder.push(index);
                bodyFinished[index]!.resolve();
                return index === 1 ? undefined : "value " + index;
            })
        );

        await Promise.all([started[0]!.promise, started[1]!.promise, started[2]!.promise]);
        finishBody[2]!.resolve();
        await bodyFinished[2]!.promise;
        await started[3]!.promise;

        finishBody[1]!.resolve();
        await bodyFinished[1]!.promise;
        finishBody[0]!.resolve();
        await bodyFinished[0]!.promise;
        finishBody[3]!.resolve();
        await bodyFinished[3]!.promise;

        await expect(pending).resolves.toEqual({
            status: "completed",
            values: ["value 0", undefined, "value 2", "value 3"],
        });
        expect(completionOrder).toEqual([2, 1, 0, 3]);
    });

    it("awaits yielded promises from an async iterable and preserves iterator receivers", async () => {
        const finishYield = gate<number>();
        const firstNextCalled = gate();
        const seen: number[] = [];
        const nextReceivers: boolean[] = [];
        let factoryReceiver = false;
        let yieldSettled = false;
        let nextCalls = 0;
        let iterator!: AsyncIterator<PromiseLike<number>>;
        const yielded = finishYield.promise.then((value) => {
            yieldSettled = true;
            return value;
        });
        iterator = {
            async next(this: AsyncIterator<PromiseLike<number>>): Promise<IteratorResult<PromiseLike<number>>> {
                nextReceivers.push(this === iterator);
                nextCalls++;
                if (nextCalls === 1) {
                    firstNextCalled.resolve();
                    return { done: false, value: yielded };
                }
                return { done: true, value: undefined };
            },
        };
        const items: AsyncIterable<PromiseLike<number>> = {
            [Symbol.asyncIterator](this: AsyncIterable<PromiseLike<number>>) {
                factoryReceiver = this === items;
                return iterator;
            },
        };

        const pending = withScope("shared", (parent) =>
            forEachInScope(parent, items, {}, async (item) => {
                seen.push(item);
            })
        );

        await firstNextCalled.promise;
        expect(seen).toEqual([]);
        finishYield.resolve(17);
        await expect(pending).resolves.toEqual({ status: "completed", started: 1 });
        expect(yieldSettled).toBe(true);
        expect(seen).toEqual([17]);
        expect(factoryReceiver).toBe(true);
        expect(nextReceivers).toEqual([true, true]);
        expect(nextCalls).toBe(2);
    });

    it("validates concurrency before acquiring an input iterator", async () => {
        const iteratorFactory = vi.fn((): Iterator<number> => ({
            next: () => ({ done: true, value: undefined }),
        }));
        const items: Iterable<number> = { [Symbol.iterator]: iteratorFactory };

        for (const concurrency of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
            await expect(
                withScope("shared", (parent) => forEachInScope(parent, items, { concurrency }, () => undefined))
            ).rejects.toBeInstanceOf(RangeError);
        }

        expect(iteratorFactory).not.toHaveBeenCalled();
    });

    it("starts no work and acquires no iterator for an already-cancelled parent", async () => {
        const parentController = new AbortController();
        parentController.abort(new Error("cancelled before iteration"));
        const iteratorFactory = vi.fn((): Iterator<number> => ({
            next: () => ({ done: true, value: undefined }),
        }));
        const items: Iterable<number> = { [Symbol.iterator]: iteratorFactory };
        const operation = vi.fn();

        const result = await withCancellation("shared", { signal: parentController.signal }, (parent) =>
            forEachInScope(parent, items, {}, (item, child, index) => operation(item, child, index))
        );

        expect(result).toEqual({ status: "cancelled", started: 0 });
        expect(iteratorFactory).not.toHaveBeenCalled();
        expect(operation).not.toHaveBeenCalled();
    });

    it("waits for a pending next result before closing once after cancellation", async () => {
        const parentController = new AbortController();
        const nextResult = gate<IteratorResult<number>>();
        const nextStarted = gate();
        const abortForwarded = gate();
        const closeStarted = gate();
        let nextSettled = false;
        let closeCalls = 0;
        let operationCalls = 0;
        const nextPromise = nextResult.promise.then((entry) => {
            nextSettled = true;
            return entry;
        });
        let iterator!: AsyncIterator<number>;
        iterator = {
            next() {
                nextStarted.resolve();
                return nextPromise;
            },
            return(this: AsyncIterator<number>) {
                closeCalls++;
                closeStarted.resolve();
                expect(this).toBe(iterator);
                expect(nextSettled).toBe(true);
                return Promise.resolve({ done: true, value: undefined });
            },
        };
        const items: AsyncIterable<number> = {
            [Symbol.asyncIterator]() {
                return iterator;
            },
        };

        const pending = withCancellation("shared", { signal: parentController.signal }, (parent) => {
            parent.signal.addEventListener(
                "abort",
                () => {
                    abortForwarded.resolve();
                },
                { once: true }
            );
            return forEachInScope(parent, items, {}, () => {
                operationCalls++;
            });
        });

        await nextStarted.promise;
        parentController.abort(new Error("cancel during next"));
        await abortForwarded.promise;
        expect(closeCalls).toBe(0);

        nextResult.resolve({ done: false, value: 9 });
        await closeStarted.promise;
        await expect(pending).resolves.toEqual({ status: "cancelled", started: 0 });
        expect(operationCalls).toBe(0);
        expect(closeCalls).toBe(1);
    });

    it("waits for a pending yielded promise before closing once after cancellation", async () => {
        const parentController = new AbortController();
        const yieldResult = gate<number>();
        const nextStarted = gate();
        const abortForwarded = gate();
        const closeStarted = gate();
        let yieldSettled = false;
        let closeCalls = 0;
        let operationCalls = 0;
        const yielded = yieldResult.promise.then((value) => {
            yieldSettled = true;
            return value;
        });
        let iterator!: AsyncIterator<Promise<number>>;
        iterator = {
            next() {
                nextStarted.resolve();
                return Promise.resolve({ done: false, value: yielded });
            },
            return(this: AsyncIterator<Promise<number>>) {
                closeCalls++;
                closeStarted.resolve();
                expect(this).toBe(iterator);
                expect(yieldSettled).toBe(true);
                return Promise.resolve({ done: true, value: undefined });
            },
        };
        const items: AsyncIterable<Promise<number>> = {
            [Symbol.asyncIterator]() {
                return iterator;
            },
        };

        const pending = withCancellation("shared", { signal: parentController.signal }, (parent) => {
            parent.signal.addEventListener(
                "abort",
                () => {
                    abortForwarded.resolve();
                },
                { once: true }
            );
            return forEachInScope(parent, items, {}, () => {
                operationCalls++;
            });
        });

        await nextStarted.promise;
        parentController.abort(new Error("cancel during yielded value"));
        await abortForwarded.promise;
        expect(closeCalls).toBe(0);

        yieldResult.resolve(12);
        await closeStarted.promise;
        await expect(pending).resolves.toEqual({ status: "cancelled", started: 0 });
        expect(operationCalls).toBe(0);
        expect(closeCalls).toBe(1);
    });

    it("retains completed mapped values when cancellation arrives during item cleanup", async () => {
        const parentController = new AbortController();
        const cleanupStarted = gate();
        const finishCleanup = gate();
        const abortForwarded = gate();
        const started: number[] = [];

        const pending = withCancellation("shared", { signal: parentController.signal }, (parent) => {
            parent.signal.addEventListener(
                "abort",
                () => {
                    abortForwarded.resolve();
                },
                { once: true }
            );
            return mapInScope(parent, ["completed", "unstarted"], { concurrency: 1 }, async (item, child, index) => {
                started.push(index);
                if (index === 0) {
                    child.defer(async () => {
                        cleanupStarted.resolve();
                        await finishCleanup.promise;
                    });
                }
                return item;
            });
        });

        await cleanupStarted.promise;
        parentController.abort(new Error("cancel during cleanup"));
        await abortForwarded.promise;
        expect(started).toEqual([0]);

        finishCleanup.resolve();
        await expect(pending).resolves.toEqual({ status: "cancelled", values: ["completed"] });
        expect(started).toEqual([0]);
    });

    it("stops admission on body failure but drains sibling work and failing-item cleanup", async () => {
        const failBody = gate();
        const failingCleanupStarted = gate();
        const finishFailingCleanup = gate();
        const siblingStarted = gate();
        const finishSibling = gate();
        const iteratorClosed = gate();
        let failingCleanupFinished = false;
        let siblingFinished = false;
        let closeCalls = 0;
        let parentClosed = false;
        const started: number[] = [];
        const bodyFailure = new Error("item body failed");
        const items = iterableWithClose([0, 1, 2, 3], () => {
            closeCalls++;
            iteratorClosed.resolve();
        });

        const pending = withScope("shared", (parent) => {
            parent.defer(() => {
                parentClosed = true;
                expect(failingCleanupFinished).toBe(true);
                expect(siblingFinished).toBe(true);
            });
            return forEachInScope(parent, items, { concurrency: 2 }, async (item, child, index) => {
                started.push(index);
                if (index === 0) {
                    child.defer(async () => {
                        failingCleanupStarted.resolve();
                        await finishFailingCleanup.promise;
                        failingCleanupFinished = true;
                    });
                    await failBody.promise;
                    throw bodyFailure;
                }
                if (index === 1) {
                    siblingStarted.resolve();
                    await finishSibling.promise;
                    siblingFinished = true;
                }
            });
        });

        await siblingStarted.promise;
        expect(started).toEqual([0, 1]);
        expect(parentClosed).toBe(false);

        failBody.resolve();
        await failingCleanupStarted.promise;
        finishSibling.resolve();
        await iteratorClosed.promise;
        expect(siblingFinished).toBe(true);
        expect(failingCleanupFinished).toBe(false);
        expect(started).toEqual([0, 1]);
        expect(parentClosed).toBe(false);

        finishFailingCleanup.resolve();
        await expect(pending).rejects.toBe(bodyFailure);
        expect(closeCalls).toBe(1);
        expect(failingCleanupFinished).toBe(true);
        expect(parentClosed).toBe(true);
    });

    it("orders multiple failures by input, item index, and iterator closure without flattening child errors", async () => {
        const started = [gate(), gate()];
        const finishBody = [gate(), gate()];
        const bodyWillThrow = [gate(), gate()];
        const closeStarted = gate();
        const inputFailure = new Error("iterator next failed");
        const bodyFailure0 = new Error("item zero failed");
        const cleanupFailure0 = new Error("item zero cleanup failed");
        const bodyFailure1 = new Error("item one failed");
        const closeFailure = new Error("iterator close failed");
        const bodyFailureOrder: number[] = [];
        let nextCalls = 0;
        let closeCalls = 0;
        const iterator: Iterator<number> = {
            next() {
                nextCalls++;
                if (nextCalls === 1) return { done: false, value: 0 };
                if (nextCalls === 2) return { done: false, value: 1 };
                throw inputFailure;
            },
            return() {
                closeCalls++;
                closeStarted.resolve();
                throw closeFailure;
            },
        };
        const items: Iterable<number> = {
            [Symbol.iterator]() {
                return iterator;
            },
        };

        const pending = withScope("shared", (parent) =>
            forEachInScope(parent, items, { concurrency: 3 }, async (_item, child, index) => {
                started[index]!.resolve();
                if (index === 0) {
                    child.defer(() => {
                        throw cleanupFailure0;
                    });
                    await finishBody[0]!.promise;
                    bodyFailureOrder.push(0);
                    bodyWillThrow[0]!.resolve();
                    throw bodyFailure0;
                }
                await finishBody[1]!.promise;
                bodyFailureOrder.push(1);
                bodyWillThrow[1]!.resolve();
                throw bodyFailure1;
            })
        );

        await Promise.all([started[0]!.promise, started[1]!.promise, closeStarted.promise]);
        finishBody[1]!.resolve();
        await bodyWillThrow[1]!.promise;
        finishBody[0]!.resolve();
        await bodyWillThrow[0]!.promise;

        const failure = await pending.catch((error: unknown) => error);
        expect(failure).toBeInstanceOf(AggregateError);
        const failures = (failure as AggregateError).errors;
        expect(failures).toHaveLength(4);
        expect(failures[0]).toBe(inputFailure);
        expect(failures[1]).toBeInstanceOf(AggregateError);
        expect((failures[1] as AggregateError).errors).toEqual([bodyFailure0, cleanupFailure0]);
        expect(failures[2]).toBe(bodyFailure1);
        expect(failures[3]).toBe(closeFailure);
        expect(bodyFailureOrder).toEqual([1, 0]);
        expect(nextCalls).toBe(3);
        expect(closeCalls).toBe(1);
    });

    it("closes an acquired iterator when reading next fails and waits for that closure", async () => {
        const failure = new Error("reading next failed");
        const closeStarted = gate();
        const finishClose = gate();
        const operation = vi.fn();
        let parentClosed = false;
        const iterator: AsyncIterator<number> = {
            get next(): AsyncIterator<number>["next"] {
                throw failure;
            },
            async return() {
                closeStarted.resolve();
                await finishClose.promise;
                return { done: true, value: undefined };
            },
        };
        const items = { [Symbol.asyncIterator]: () => iterator };

        const pending = withScope("shared", (parent) => {
            parent.defer(() => {
                parentClosed = true;
            });
            return forEachInScope(parent, items, {}, operation);
        });

        await closeStarted.promise;
        expect(operation).not.toHaveBeenCalled();
        expect(parentClosed).toBe(false);
        finishClose.resolve();
        await expect(pending).rejects.toBe(failure);
        expect(parentClosed).toBe(true);
    });

    it("retains cancellation during final cleanup without closing an exhausted iterator", async () => {
        const controller = new AbortController();
        const inputExhausted = gate();
        const cleanupStarted = gate();
        const finishCleanup = gate();
        const close = vi.fn(() => ({ done: true as const, value: undefined }));
        let nextCalls = 0;
        const items: Iterable<number> = {
            [Symbol.iterator]: () => ({
                next() {
                    if (nextCalls++ === 0) return { done: false, value: 42 };
                    inputExhausted.resolve();
                    return { done: true, value: undefined };
                },
                return: close,
            }),
        };

        const pending = withCancellation("shared", { signal: controller.signal }, (parent) =>
            mapInScope(parent, items, { concurrency: 2 }, (item, child) => {
                child.defer(async () => {
                    cleanupStarted.resolve();
                    await finishCleanup.promise;
                });
                return item;
            })
        );

        await Promise.all([inputExhausted.promise, cleanupStarted.promise]);
        controller.abort();
        expect(close).not.toHaveBeenCalled();
        finishCleanup.resolve();
        await expect(pending).resolves.toEqual({ status: "cancelled", values: [42] });
        expect(close).not.toHaveBeenCalled();
        expect(nextCalls).toBe(2);
    });

    it("preserves a single thrown undefined failure", async () => {
        const pending = withScope("shared", (parent) =>
            forEachInScope(parent, [0], {}, () => {
                throw undefined;
            })
        );

        await expect(pending).rejects.toBeUndefined();
    });

    it("continues when a callback deliberately catches its own failure", async () => {
        const failure = new Error("handled item failure");
        const handled: unknown[] = [];
        const visited: number[] = [];

        const result = await withScope("shared", (parent) =>
            forEachInScope(parent, [0, 1, 2], {}, async (item) => {
                visited.push(item);
                try {
                    if (item === 1) throw failure;
                } catch (error) {
                    handled.push(error);
                }
            })
        );

        expect(result).toEqual({ status: "completed", started: 3 });
        expect(visited).toEqual([0, 1, 2]);
        expect(handled).toEqual([failure]);
    });
});
