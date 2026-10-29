import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { createCoalescingNotifier, type CoalescingNotifier } from "./concurrency/coalescingNotifier.ts";
import { createDeferredAction, type DeferredAction } from "./concurrency/deferredAction.ts";
import { createOwnedResource, withOwnedResource, type DisposableResource, type OwnedResource } from "./resource.ts";

function deferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

function thrownBy(action: () => void): { threw: boolean; value: unknown } {
    try {
        action();
        return { threw: false, value: undefined };
    } catch (value) {
        return { threw: true, value };
    }
}

describe("createOwnedResource", () => {
    it("wraps an existing callable value without eager cleanup and keeps instances independent", () => {
        const log = vi.fn<(message: string) => void>();
        const firstCleanup = vi.fn<(value: typeof log) => void>();
        const secondCleanup = vi.fn<(value: typeof log) => void>();
        const first = createOwnedResource(log, firstCleanup);
        const second = createOwnedResource(log, secondCleanup);

        expectTypeOf(first).toEqualTypeOf<OwnedResource<typeof log>>();
        expect(first.value).toBe(log);
        expect(firstCleanup).not.toHaveBeenCalled();
        expect(secondCleanup).not.toHaveBeenCalled();

        first.value("still callable");
        expect(log).toHaveBeenCalledExactlyOnceWith("still callable");
        first.dispose();
        first.dispose();
        expect(firstCleanup).toHaveBeenCalledExactlyOnceWith(log);
        expect(secondCleanup).not.toHaveBeenCalled();

        second.dispose();
        expect(secondCleanup).toHaveBeenCalledExactlyOnceWith(log);
    });

    it("caches the same asynchronous cleanup promise while pending and after fulfilment", async () => {
        const cleanup = deferred<void>();
        const dispose = vi.fn(() => cleanup.promise);
        const resource = createOwnedResource({ id: 1 }, dispose);

        const first = resource.dispose();
        expect(dispose).toHaveBeenCalledOnce();
        expect(resource.dispose()).toBe(first);
        cleanup.resolve();
        await first;
        expect(resource.dispose()).toBe(first);
        expect(dispose).toHaveBeenCalledOnce();
    });

    it("retains a rejected cleanup promise without retrying", async () => {
        const failure = new Error("cleanup");
        const release = vi.fn(() => Promise.reject(failure));
        const resource = createOwnedResource("value", release);
        const pending = resource.dispose();
        expect(resource.dispose()).toBe(pending);
        await expect(pending).rejects.toBe(failure);
        expect(resource.dispose()).toBe(pending);
        await expect(resource.dispose()).rejects.toBe(failure);
        expect(release).toHaveBeenCalledOnce();
    });

    it("retains synchronous cleanup failures, including undefined, without retrying", () => {
        for (const failure of [new Error("cleanup failed"), undefined]) {
            const dispose = vi.fn((): never => {
                throw failure;
            });
            const resource = createOwnedResource("value", dispose);

            const first = thrownBy(() => resource.dispose());
            const second = thrownBy(() => resource.dispose());
            expect(first.threw).toBe(true);
            expect(first.value).toBe(failure);
            expect(second.threw).toBe(true);
            expect(second.value).toBe(failure);
            expect(dispose).toHaveBeenCalledOnce();
        }
    });

    it("marks disposal started before running reentrant cleanup", () => {
        let resource!: OwnedResource<object>;
        const dispose = vi.fn(() => resource.dispose());
        resource = createOwnedResource({}, dispose);

        expect(() => resource.dispose()).not.toThrow();
        expect(dispose).toHaveBeenCalledOnce();
    });
});

describe("withOwnedResource", () => {
    it("passes the same resource, preserves the dispose receiver, and waits for operation and cleanup", async () => {
        const operationStarted = deferred<void>();
        const operationWork = deferred<number>();
        const cleanupStarted = deferred<void>();
        const cleanupWork = deferred<void>();
        let disposeReceiver: unknown;
        let disposeCalls = 0;
        const resource = {
            id: Symbol("resource"),
            dispose() {
                disposeCalls++;
                disposeReceiver = this;
                cleanupStarted.resolve();
                return cleanupWork.promise;
            },
        };
        const thenable: PromiseLike<number> = {
            then(onfulfilled, onrejected) {
                operationStarted.resolve();
                return operationWork.promise.then(onfulfilled, onrejected);
            },
        };
        const operation = vi.fn((received: typeof resource) => {
            expect(received).toBe(resource);
            return thenable;
        });
        const result = withOwnedResource(resource, operation);
        let settled = false;
        const observed = result.then((value) => {
            settled = true;
            return value;
        });

        await operationStarted.promise;
        expect(operation).toHaveBeenCalledExactlyOnceWith(resource);
        expect(disposeCalls).toBe(0);
        operationWork.resolve(42);
        await cleanupStarted.promise;
        expect(disposeCalls).toBe(1);
        expect(disposeReceiver).toBe(resource);
        await Promise.resolve();
        expect(settled).toBe(false);

        cleanupWork.resolve();
        await expect(observed).resolves.toBe(42);
        expect(settled).toBe(true);
        expect(disposeCalls).toBe(1);
    });

    it("cleans up after synchronous throws and asynchronous rejections", async () => {
        const syncFailure = new Error("synchronous operation failed");
        const syncDispose = vi.fn();
        const syncResource = createOwnedResource("sync", syncDispose);
        await expect(
            withOwnedResource(syncResource, () => {
                throw syncFailure;
            })
        ).rejects.toBe(syncFailure);
        expect(syncDispose).toHaveBeenCalledOnce();

        const asyncDispose = vi.fn();
        const asyncResource = createOwnedResource("async", asyncDispose);
        await expect(withOwnedResource(asyncResource, () => Promise.reject(undefined))).rejects.toBeUndefined();
        expect(asyncDispose).toHaveBeenCalledOnce();
    });

    it("propagates synchronous and asynchronous cleanup failures, with cleanup winning when both fail", async () => {
        const syncCleanupFailure = new Error("synchronous cleanup failed");
        await expect(
            withOwnedResource(
                createOwnedResource("sync", () => {
                    throw syncCleanupFailure;
                }),
                () => "complete"
            )
        ).rejects.toBe(syncCleanupFailure);

        const operationFailure = new Error("operation failed");
        const asyncCleanupFailure = new Error("asynchronous cleanup failed");
        await expect(
            withOwnedResource(
                createOwnedResource("async", () => Promise.reject(asyncCleanupFailure)),
                () => Promise.reject(operationFailure)
            )
        ).rejects.toBe(asyncCleanupFailure);
    });

    it("disposes existing deferred actions and notifiers through the shared contract", async () => {
        expectTypeOf<DeferredAction>().toMatchTypeOf<DisposableResource>();
        expectTypeOf<CoalescingNotifier<unknown>>().toMatchTypeOf<DisposableResource>();
        expectTypeOf<ReturnType<DeferredAction["dispose"]>>().toEqualTypeOf<void>();
        expectTypeOf<ReturnType<CoalescingNotifier<unknown>["dispose"]>>().toEqualTypeOf<void>();

        const cancel = vi.fn();
        const deferredAction = createDeferredAction(
            () => undefined,
            () => cancel
        );
        const result = { completed: true };
        await expect(
            withOwnedResource(deferredAction, (owned) => {
                owned.schedule(10);
                return result;
            })
        ).resolves.toBe(result);
        expect(cancel).toHaveBeenCalledOnce();

        const notify = vi.fn();
        const notifier = createCoalescingNotifier({ everyCount: 2, onNotify: notify });
        await withOwnedResource(notifier, (owned) => owned.update(1));
        notifier.flush();
        notifier.update(2);
        expect(notify).not.toHaveBeenCalled();
    });
});
