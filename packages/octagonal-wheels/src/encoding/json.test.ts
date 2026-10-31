import { describe, expect, it } from "vitest";
import { cloneViaJSON } from "./index.ts";

// Exercise native runtime behaviour independently of the stricter typed API.
const cloneRuntime = cloneViaJSON as (value: unknown) => unknown;

describe("cloneViaJSON", () => {
    it("creates an independent object graph", () => {
        const source = { nested: { value: 1 }, items: [{ value: 2 }] };
        const clone = cloneViaJSON(source);

        expect(clone).toEqual(source);
        expect(clone).not.toBe(source);
        expect(clone.nested).not.toBe(source.nested);
        expect(clone.items).not.toBe(source.items);
        expect(clone.items[0]).not.toBe(source.items[0]);

        clone.nested.value = 3;
        expect(source.nested.value).toBe(1);
    });

    it("retains native JSON's lossy value conversions", () => {
        const source = {
            date: new Date("2024-01-02T03:04:05.000Z"),
            notANumber: Number.NaN,
            omitted: undefined,
            array: [undefined],
        };

        expect(cloneRuntime(source)).toEqual({
            date: "2024-01-02T03:04:05.000Z",
            notANumber: null,
            array: [null],
        });
    });

    it("runs native toJSON hooks during serialisation", () => {
        let calls = 0;
        const source = {
            value: 1,
            toJSON() {
                calls++;
                return { value: 2 };
            },
        };

        expect(cloneRuntime(source)).toEqual({ value: 2 });
        expect(calls).toBe(1);
    });

    it("propagates native failures for unsupported values", () => {
        const circular: { self?: unknown } = {};
        circular.self = circular;

        expect(() => cloneRuntime(undefined)).toThrow(SyntaxError);
        expect(() => cloneRuntime(circular)).toThrow(TypeError);
        expect(() => cloneRuntime(BigInt(1))).toThrow(TypeError);
    });
});
