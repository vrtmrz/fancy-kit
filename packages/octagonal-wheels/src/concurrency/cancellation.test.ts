import { describe, expect, it, vi } from "vitest";
import { promiseWithResolvers } from "../promises.ts";
import { scoped } from "../resource/scope.ts";
import { withCancellation, type Cancellation } from "./cancellation.ts";

describe("withCancellation", () => {
    it("invokes the operation when the parent is already cancelled and preserves its result", async () => {
        const parent = new AbortController();
        const reason = { source: "parent" };
        const partial = { status: "cancelled", records: 3 };
        parent.abort(reason);
        let ownedSignal: AbortSignal | undefined;
        let invoked = false;

        const result = await withCancellation("input", { signal: parent.signal }, (ctx) => {
            invoked = true;
            ownedSignal = ctx.signal;
            expect(ctx.isCancelled()).toBe(true);
            expect(ctx.signal.reason).toBe(reason);
            return partial;
        });

        expect(invoked).toBe(true);
        expect(result).toBe(partial);
        expect(ownedSignal).not.toBe(parent.signal);
        expect(ownedSignal?.aborted).toBe(true);
        expect(ownedSignal?.reason).toBe(reason);
        expect(parent.signal.aborted).toBe(true);
    });

    it("forwards cancellation during work and waits for the late operation result", async () => {
        const parent = new AbortController();
        const reason = new Error("parent cancelled");
        const started = promiseWithResolvers<void>();
        const work = promiseWithResolvers<{ status: string }>();
        const partial = { status: "partial" };
        let ownedSignal: AbortSignal | undefined;
        let settled = false;

        const result = withCancellation("input", { signal: parent.signal }, (ctx) => {
            ownedSignal = ctx.signal;
            started.resolve();
            return work.promise;
        });
        void result.then(
            () => {
                settled = true;
            },
            () => {
                settled = true;
            }
        );

        await started.promise;
        parent.abort(reason);
        expect(ownedSignal?.aborted).toBe(true);
        expect(ownedSignal?.reason).toBe(reason);
        await Promise.resolve();
        expect(settled).toBe(false);

        work.resolve(partial);
        expect(await result).toBe(partial);
        expect(settled).toBe(true);
    });

    it("forwards cancellation during cleanup and retains the completed result", async () => {
        const parent = new AbortController();
        const reason = { source: "cleanup" };
        const cleanupStarted = promiseWithResolvers<void>();
        const finishCleanup = promiseWithResolvers<void>();
        const completed = { status: "complete" };
        let ownedSignal: AbortSignal | undefined;
        let settled = false;

        const result = withCancellation("input", { signal: parent.signal }, (ctx) => {
            ownedSignal = ctx.signal;
            ctx.defer(async () => {
                cleanupStarted.resolve();
                await finishCleanup.promise;
            });
            return completed;
        });
        void result.then(
            () => {
                settled = true;
            },
            () => {
                settled = true;
            }
        );

        await cleanupStarted.promise;
        parent.abort(reason);
        expect(ownedSignal?.aborted).toBe(true);
        expect(ownedSignal?.reason).toBe(reason);
        await Promise.resolve();
        expect(settled).toBe(false);

        finishCleanup.resolve();
        expect(await result).toBe(completed);
        expect(settled).toBe(true);
    });

    it("runs user cleanup in reverse order before unlinking and aborting its signal", async () => {
        const parent = new AbortController();
        const removeParentListener = vi.spyOn(parent.signal, "removeEventListener");
        const order: string[] = [];
        let ownedSignal: AbortSignal | undefined;

        const result = await withCancellation("input", { signal: parent.signal }, (ctx) => {
            ownedSignal = ctx.signal;
            ctx.signal.addEventListener("abort", () => {
                order.push("owned-abort");
            });
            ctx.defer(() => {
                order.push("first-cleanup");
                expect(removeParentListener).not.toHaveBeenCalled();
                expect(ctx.signal.aborted).toBe(false);
            });
            ctx.defer(() => {
                order.push("second-cleanup");
            });
            return "done";
        });

        expect(result).toBe("done");
        expect(order).toEqual(["second-cleanup", "first-cleanup", "owned-abort"]);
        expect(removeParentListener).toHaveBeenCalledOnce();
        expect(ownedSignal?.aborted).toBe(true);
        expect(parent.signal.aborted).toBe(false);
    });

    it("removes the exact parent listener after normal completion", async () => {
        const parent = new AbortController();
        const addParentListener = vi.spyOn(parent.signal, "addEventListener");
        const removeParentListener = vi.spyOn(parent.signal, "removeEventListener");

        await withCancellation("input", { signal: parent.signal }, () => "done");

        expect(addParentListener).toHaveBeenCalledOnce();
        expect(addParentListener.mock.calls[0]?.[0]).toBe("abort");
        const registeredListener = addParentListener.mock.calls[0]?.[1];
        expect(removeParentListener).toHaveBeenCalledExactlyOnceWith("abort", registeredListener);
    });

    it("runs internal cleanup even when a user cleanup fails", async () => {
        const parent = new AbortController();
        const cleanupError = new Error("user cleanup failed");
        const removeParentListener = vi.spyOn(parent.signal, "removeEventListener");
        let ownedSignal: AbortSignal | undefined;

        const result = withCancellation("input", { signal: parent.signal }, (ctx) => {
            ownedSignal = ctx.signal;
            ctx.defer(() => {
                throw cleanupError;
            });
            return "completed";
        });

        await expect(result).rejects.toBe(cleanupError);
        expect(removeParentListener).toHaveBeenCalledOnce();
        expect(ownedSignal?.aborted).toBe(true);
        expect(parent.signal.aborted).toBe(false);
    });

    it("keeps operation errors unchanged and still completes cleanup", async () => {
        const operationError = new Error("operation failed");
        let cleanupRan = false;
        let ownedSignal: AbortSignal | undefined;

        const result = withCancellation("input", {}, (ctx) => {
            ownedSignal = ctx.signal;
            ctx.defer(() => {
                cleanupRan = true;
            });
            throw operationError;
        });

        await expect(result).rejects.toBe(operationError);
        expect(cleanupRan).toBe(true);
        expect(ownedSignal?.aborted).toBe(true);
    });

    it("creates independent owned signals for overlapping invocations", async () => {
        const firstStarted = promiseWithResolvers<void>();
        const secondStarted = promiseWithResolvers<void>();
        const finishFirst = promiseWithResolvers<void>();
        const finishSecond = promiseWithResolvers<void>();
        let firstSignal: AbortSignal | undefined;
        let secondSignal: AbortSignal | undefined;

        const first = withCancellation("first", {}, async (ctx) => {
            firstSignal = ctx.signal;
            firstStarted.resolve();
            await finishFirst.promise;
            return "first";
        });
        const second = withCancellation("second", {}, async (ctx) => {
            secondSignal = ctx.signal;
            secondStarted.resolve();
            await finishSecond.promise;
            return "second";
        });

        await Promise.all([firstStarted.promise, secondStarted.promise]);
        expect(firstSignal).not.toBe(secondSignal);
        expect(firstSignal?.aborted).toBe(false);
        expect(secondSignal?.aborted).toBe(false);

        finishFirst.resolve();
        expect(await first).toBe("first");
        expect(firstSignal?.aborted).toBe(true);
        expect(secondSignal?.aborted).toBe(false);

        finishSecond.resolve();
        expect(await second).toBe("second");
        expect(secondSignal?.aborted).toBe(true);
    });

    it("lets child scopes observe the borrowed signal without aborting it when they close", async () => {
        const childCleanupStates: boolean[] = [];
        let childSignal: AbortSignal | undefined;
        const childProgram = scoped<number, Cancellation>()
            .pipeScoped((ctx) => {
                childSignal = ctx.signal;
                ctx.defer(() => {
                    childCleanupStates.push(ctx.signal.aborted);
                });
                return "child result";
            })
            .pipe((ctx) => {
                expect(ctx.signal).toBe(childSignal);
                expect(ctx.isCancelled()).toBe(false);
                return ctx.value;
            });

        const result = await withCancellation(4, {}, childProgram);

        expect(result).toBe("child result");
        expect(childCleanupStates).toEqual([false]);
        expect(childSignal?.aborted).toBe(true);
    });
});
