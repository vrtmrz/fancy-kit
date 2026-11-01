import { describe, expect, it, vi } from "vitest";
import { withLocks, withLock, serialized, isLockAcquired } from "./lock.ts";
import { promiseWithResolvers } from "../promises.ts";

describe("withLocks", () => {
    it("runs an empty-key callback immediately and returns its result", async () => {
        const result = { value: 42 };
        const callback = vi.fn(async () => result);
        const pending = withLocks([], callback);
        expect(callback).toHaveBeenCalledOnce();
        await expect(pending).resolves.toBe(result);
    });

    it("acquires all keys without mutating the supplied list", async () => {
        const keys = Object.freeze(["multi:acquire:a", "multi:acquire:b"]);
        await withLocks(keys, async () => {
            expect(keys.every(isLockAcquired)).toBe(true);
        });
        expect(keys.some(isLockAcquired)).toBe(false);
        expect(keys).toEqual(["multi:acquire:a", "multi:acquire:b"]);
    });

    it("holds overlapping operations while allowing independent keys", async () => {
        const gate = promiseWithResolvers<void>();
        const first = withLocks(["multi:overlap:a", "multi:overlap:b"], async () => {
            await gate.promise;
            return "first";
        });
        const overlapping = vi.fn(async () => "overlap");
        const second = withLocks(["multi:overlap:b", "multi:overlap:c"], overlapping);
        try {
            await expect(withLocks(["multi:overlap:d"], async () => "independent")).resolves.toBe("independent");
            expect(overlapping).not.toHaveBeenCalled();
        } finally {
            gate.resolve();
            await expect(Promise.all([first, second])).resolves.toEqual(["first", "overlap"]);
        }
    });

    it("shares locks with single-key operations before and after acquisition", async () => {
        const gate = promiseWithResolvers<void>();
        const events: string[] = [];
        const first = serialized("multi:single:b", async () => {
            events.push("single-before");
            await gate.promise;
        });
        const multi = withLocks(["multi:single:a", "multi:single:b"], async () => {
            events.push("multi");
        });
        const last = serialized("multi:single:a", async () => {
            events.push("single-after");
        });
        try {
            expect(events).toEqual(["single-before"]);
            expect(isLockAcquired("multi:single:a")).toBe(true);
        } finally {
            gate.resolve();
            await Promise.all([first, multi, last]);
        }
        expect(events).toEqual(["single-before", "multi", "single-after"]);
    });

    it.each(["throw", "reject"] as const)("preserves a callback %s and releases every key", async (mode) => {
        const keys = [`multi:failure:${mode}:a`, `multi:failure:${mode}:b`];
        const error = new Error(mode);
        await expect(
            withLocks(keys, () => {
                if (mode === "throw") throw error;
                return Promise.reject(error);
            })
        ).rejects.toBe(error);
        expect(keys.some(isLockAcquired)).toBe(false);
        await expect(withLocks(keys, async () => "retry")).resolves.toBe("retry");
    });
});


describe("withLock", () => {
    it("shares a lock with the legacy entry and preserves synchronous results", async () => {
        const gate = promiseWithResolvers<void>();
        const events: string[] = [];
        const first = withLock("single:legacy", async () => {
            events.push("new");
            await gate.promise;
            return 1;
        });
        const second = serialized("single:legacy", () => {
            events.push("legacy");
            return 2;
        });
        expect(events).toEqual(["new"]);
        gate.resolve();
        await expect(Promise.all([first, second])).resolves.toEqual([1, 2]);
        expect(events).toEqual(["new", "legacy"]);
        expect(isLockAcquired("single:legacy")).toBe(false);
    });
});
