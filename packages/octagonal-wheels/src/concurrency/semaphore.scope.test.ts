import { describe, expect, it, vi } from "vitest";
import { promiseWithResolvers } from "../promises.ts";
import { Semaphore, withSemaphore, type SemaphoreReleaser } from "./semaphore.ts";

describe("withSemaphore", () => {
    it("returns a synchronous result and acquires with the original receiver and default quantity", async () => {
        const release = vi.fn();
        const semaphore = { acquire: vi.fn(async () => release) };
        const result = { value: 42 };
        const operation = vi.fn(() => result);

        expect(await withSemaphore(semaphore, operation)).toBe(result);
        expect(semaphore.acquire).toHaveBeenCalledExactlyOnceWith();
        expect(semaphore.acquire.mock.contexts).toEqual([semaphore]);
        expect(operation).toHaveBeenCalledExactlyOnceWith();
        expect(release).toHaveBeenCalledExactlyOnceWith();
        expect(operation.mock.invocationCallOrder[0]).toBeLessThan(release.mock.invocationCallOrder[0]);
    });

    it("starts the operation only after acquisition resolves", async () => {
        const acquired = promiseWithResolvers<SemaphoreReleaser>();
        const release = vi.fn();
        const operation = vi.fn(() => "done");
        const result = withSemaphore({ acquire: () => acquired.promise }, operation);
        await Promise.resolve();
        expect(operation).not.toHaveBeenCalled();
        expect(release).not.toHaveBeenCalled();

        acquired.resolve(release);
        expect(await result).toBe("done");
        expect(operation).toHaveBeenCalledOnce();
        expect(release).toHaveBeenCalledOnce();
    });

    it("holds the permit until an asynchronous result settles", async () => {
        const started = promiseWithResolvers<void>();
        const work = promiseWithResolvers<number>();
        const release = vi.fn();
        const result = withSemaphore({ acquire: async () => release }, () => {
            started.resolve();
            return work.promise;
        });
        await started.promise;
        expect(release).not.toHaveBeenCalled();

        work.resolve(7);
        expect(await result).toBe(7);
        expect(release).toHaveBeenCalledOnce();
    });

    it("awaits a thenable before releasing", async () => {
        const started = promiseWithResolvers<void>();
        const work = promiseWithResolvers<string>();
        const release = vi.fn();
        const thenable: PromiseLike<string> = {
            then(onfulfilled, onrejected) {
                started.resolve();
                return work.promise.then(onfulfilled, onrejected);
            },
        };
        const result = withSemaphore({ acquire: async () => release }, () => thenable);
        await started.promise;
        expect(release).not.toHaveBeenCalled();
        work.resolve("thenable");
        expect(await result).toBe("thenable");
        expect(release).toHaveBeenCalledOnce();
    });

    it("releases once after a synchronous operation throws and preserves the error", async () => {
        const error = new Error("operation");
        const release = vi.fn();
        await expect(
            withSemaphore({ acquire: async () => release }, () => {
                throw error;
            })
        ).rejects.toBe(error);
        expect(release).toHaveBeenCalledOnce();
    });

    it("releases once after an asynchronous operation rejects", async () => {
        const started = promiseWithResolvers<void>();
        const work = promiseWithResolvers<void>();
        const error = new Error("operation");
        const release = vi.fn();
        const result = withSemaphore({ acquire: async () => release }, () => {
            started.resolve();
            return work.promise;
        });
        const rejected = expect(result).rejects.toBe(error);
        await started.promise;
        expect(release).not.toHaveBeenCalled();
        work.reject(error);
        await rejected;
        expect(release).toHaveBeenCalledOnce();
    });

    it("propagates a synchronous acquisition failure without starting the operation", async () => {
        const error = new Error("acquire");
        const operation = vi.fn();
        const acquire = vi.fn((): Promise<SemaphoreReleaser> => {
            throw error;
        });
        await expect(withSemaphore({ acquire }, operation)).rejects.toBe(error);
        expect(acquire).toHaveBeenCalledOnce();
        expect(operation).not.toHaveBeenCalled();
    });

    it("propagates a rejected acquisition without starting the operation", async () => {
        const error = new Error("acquire");
        const operation = vi.fn();
        await expect(
            withSemaphore(
                {
                    acquire: async () => {
                        throw error;
                    },
                },
                operation
            )
        ).rejects.toBe(error);
        expect(operation).not.toHaveBeenCalled();
    });

    it("rejects with a release error after a successful operation", async () => {
        const error = new Error("release");
        const release = vi.fn(() => {
            throw error;
        });
        await expect(withSemaphore({ acquire: async () => release }, () => 42)).rejects.toBe(error);
        expect(release).toHaveBeenCalledOnce();
    });

    it("uses ordinary finally semantics when both operation and release fail", async () => {
        const operationError = new Error("operation");
        const releaseError = new Error("release");
        const release = vi.fn(() => {
            throw releaseError;
        });
        await expect(
            withSemaphore({ acquire: async () => release }, async () => {
                throw operationError;
            })
        ).rejects.toBe(releaseError);
        expect(release).toHaveBeenCalledOnce();
    });

    it("preserves a non-Error rejection value", async () => {
        const release = vi.fn();
        await expect(
            withSemaphore({ acquire: async () => release }, () => Promise.reject(undefined))
        ).rejects.toBeUndefined();
        expect(release).toHaveBeenCalledOnce();
    });

    it("bounds actual semaphore work and passes permits to queued operations after success and failure", async () => {
        const semaphore = Semaphore(2);
        const started = Array.from({ length: 5 }, () => promiseWithResolvers<void>());
        const work = Array.from({ length: 5 }, () => promiseWithResolvers<void>());
        const failure = new Error("second task");
        const order: number[] = [];
        let active = 0;
        let maximum = 0;
        const tasks = work.map((gate, index) =>
            withSemaphore(semaphore, async () => {
                active++;
                maximum = Math.max(maximum, active);
                order.push(index);
                started[index].resolve();
                try {
                    await gate.promise;
                    if (index === 1) throw failure;
                    return index;
                } finally {
                    active--;
                }
            })
        );
        const settled = Promise.allSettled(tasks);
        await Promise.all([started[0].promise, started[1].promise]);
        expect(order).toEqual([0, 1]);
        expect(semaphore.waiting).toBe(3);
        work[0].resolve();
        await started[2].promise;
        expect(order).toEqual([0, 1, 2]);
        work[1].resolve();
        await started[3].promise;
        expect(order).toEqual([0, 1, 2, 3]);
        work.slice(2).forEach((gate) => gate.resolve());
        expect(await settled).toEqual([
            { status: "fulfilled", value: 0 },
            { status: "rejected", reason: failure },
            { status: "fulfilled", value: 2 },
            { status: "fulfilled", value: 3 },
            { status: "fulfilled", value: 4 },
        ]);
        expect(maximum).toBe(2);
        expect(active).toBe(0);
        expect(semaphore.waiting).toBe(0);
        expect(await withSemaphore(semaphore, () => "reusable")).toBe("reusable");
    });
});
