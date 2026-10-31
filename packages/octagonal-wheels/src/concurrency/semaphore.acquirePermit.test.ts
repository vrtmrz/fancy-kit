import { describe, expect, it, vi } from "vitest";
import { promiseWithResolvers } from "../promises.ts";
import { acquirePermit } from "./semaphore.ts";

describe("acquirePermit", () => {
    it("preserves the value, receiver, default arguments, and release registration", async () => {
        const marker = {};
        const release = vi.fn();
        const acquired = promiseWithResolvers<() => void>();
        const semaphore = {
            marker,
            acquire: vi.fn(function (this: { marker: object }) {
                expect(this.marker).toBe(marker);
                return acquired.promise;
            }),
        };
        const value = { record: 42 };
        const cleanups: Array<() => void> = [];
        const context = {
            value,
            defer(cleanup: () => void) {
                cleanups.push(cleanup);
            },
        };

        const result = acquirePermit(semaphore)(context);

        expect(semaphore.acquire).toHaveBeenCalledExactlyOnceWith();
        expect(semaphore.acquire.mock.contexts).toEqual([semaphore]);
        expect(cleanups).toEqual([]);

        acquired.resolve(release);
        expect(await result).toBe(value);
        expect(cleanups).toEqual([release]);
        expect(release).not.toHaveBeenCalled();

        cleanups[0]?.();
        expect(release).toHaveBeenCalledOnce();
    });

    it("does not register a release when acquisition rejects", async () => {
        const acquisitionError = new Error("acquisition failed");
        const defer = vi.fn((_cleanup: () => void | PromiseLike<void>) => {});
        const context = {
            value: "current",
            defer,
        };
        const semaphore = {
            acquire: async () => {
                throw acquisitionError;
            },
        };

        await expect(acquirePermit(semaphore)(context)).rejects.toBe(acquisitionError);
        expect(defer).not.toHaveBeenCalled();
    });

    it("propagates a synchronous acquisition failure without registering cleanup", async () => {
        const acquisitionError = new Error("synchronous acquisition failed");
        const defer = vi.fn((_cleanup: () => void | PromiseLike<void>) => {});
        const context = {
            value: "current",
            defer,
        };
        const semaphore = {
            acquire: vi.fn(() => {
                throw acquisitionError;
            }),
        };

        await expect(acquirePermit(semaphore)(context)).rejects.toBe(acquisitionError);
        expect(semaphore.acquire).toHaveBeenCalledOnce();
        expect(defer).not.toHaveBeenCalled();
    });
});
