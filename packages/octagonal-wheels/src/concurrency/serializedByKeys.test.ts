import { describe, expect, it, vi } from "vitest";
import { serializedByKeys, serialized, isLockAcquired } from "./lock.ts";
import { promiseWithResolvers } from "../promises.ts";

describe("serializedByKeys", () => {
    it("runs an empty-key callback immediately and returns its result", async () => {
        const result = { value: 42 };
        const callback = vi.fn(async () => result);
        const pending = serializedByKeys([], callback);
        expect(callback).toHaveBeenCalledOnce();
        await expect(pending).resolves.toBe(result);
    });

    it("acquires all keys without mutating the supplied list", async () => {
        const keys = Object.freeze(["multi:acquire:a", "multi:acquire:b"]);
        await serializedByKeys(keys, async () => {
            expect(keys.every(isLockAcquired)).toBe(true);
        });
        expect(keys.some(isLockAcquired)).toBe(false);
        expect(keys).toEqual(["multi:acquire:a", "multi:acquire:b"]);
    });

    it("holds overlapping operations while allowing independent keys", async () => {
        const gate = promiseWithResolvers<void>();
        const first = serializedByKeys(["multi:overlap:a", "multi:overlap:b"], async () => {
            await gate.promise;
            return "first";
        });
        const overlapping = vi.fn(async () => "overlap");
        const second = serializedByKeys(["multi:overlap:b", "multi:overlap:c"], overlapping);
        try {
            await expect(serializedByKeys(["multi:overlap:d"], async () => "independent")).resolves.toBe("independent");
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
        const multi = serializedByKeys(["multi:single:a", "multi:single:b"], async () => {
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
            serializedByKeys(keys, () => {
                if (mode === "throw") throw error;
                return Promise.reject(error);
            })
        ).rejects.toBe(error);
        expect(keys.some(isLockAcquired)).toBe(false);
        await expect(serializedByKeys(keys, async () => "retry")).resolves.toBe("retry");
    });
});
