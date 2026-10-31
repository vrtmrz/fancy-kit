import { describe, expect, it, vi } from "vitest";
import { onlyWhenChanged } from "./function.ts";

describe("onlyWhenChanged", () => {
    it("suppresses consecutive equal values and retains only the last value", () => {
        const callback = vi.fn();
        const invoke = onlyWhenChanged<string>(callback);
        for (const value of ["a", "a", "b", "b", "a"]) invoke(value);
        expect(callback.mock.calls).toEqual([["a"], ["b"], ["a"]]);
    });

    it("starts with undefined and invokes it after another value", () => {
        const callback = vi.fn();
        const invoke = onlyWhenChanged<string | undefined>(callback);
        invoke(undefined);
        expect(callback).not.toHaveBeenCalled();
        invoke("value");
        invoke(undefined);
        invoke(undefined);
        expect(callback.mock.calls).toEqual([["value"], [undefined]]);
    });

    it("uses strict equality for NaN and signed zero", () => {
        const callback = vi.fn();
        const invoke = onlyWhenChanged<number>(callback);
        invoke(0);
        invoke(-0);
        invoke(NaN);
        invoke(NaN);
        expect(callback.mock.calls).toEqual([[0], [NaN], [NaN]]);
    });

    it("compares objects by identity", () => {
        const callback = vi.fn();
        const invoke = onlyWhenChanged<object>(callback);
        const first = { value: 1 };
        const second = { value: 1 };
        invoke(first);
        first.value = 2;
        invoke(first);
        invoke(second);
        expect(callback).toHaveBeenCalledTimes(2);
        expect(callback.mock.calls[0][0]).toBe(first);
        expect(callback.mock.calls[1][0]).toBe(second);
    });

    it("keeps each wrapper independent", () => {
        const callback = vi.fn();
        const first = onlyWhenChanged<boolean>(callback);
        const second = onlyWhenChanged<boolean>(callback);
        first(false);
        second(false);
        first(false);
        second(false);
        expect(callback.mock.calls).toEqual([[false], [false]]);
    });

    it("propagates a synchronous exception and retains the preceding value", () => {
        const error = new Error("failed");
        let fail = true;
        const callback = vi.fn((value: string) => {
            if (fail && value === "next") throw error;
        });
        const invoke = onlyWhenChanged(callback);
        invoke("initial");
        expect(() => invoke("next")).toThrow(error);
        invoke("initial");
        fail = false;
        invoke("next");
        invoke("next");
        expect(callback.mock.calls).toEqual([["initial"], ["next"], ["next"]]);
    });

    it("discards the callback result and does not wait for returned promises", async () => {
        let resolve!: () => void;
        const pending = new Promise<void>((done) => {
            resolve = done;
        });
        const callback = vi.fn(() => pending);
        const invoke = onlyWhenChanged<string>(callback);
        expect(invoke("value")).toBeUndefined();
        invoke("value");
        expect(callback).toHaveBeenCalledOnce();
        resolve();
        await pending;
    });
});
