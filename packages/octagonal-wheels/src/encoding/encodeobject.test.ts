import { describe, it, expect } from "vitest";
import { encodeAnyArray, decodeAnyArray } from "./encodeobject.ts";

describe("encodeAnyArray and decodeAnyArray", () => {
    for (const safer of [true, false]) {
        const testSuffix = safer ? " (safer)" : " (stronger compression)";
        it("should handle an empty array" + testSuffix, () => {
            const arr: any[] = [];
            const encoded = encodeAnyArray(arr, safer);
            expect(encoded).toBe("");
            const decoded = decodeAnyArray(encoded);
            expect(decoded).toEqual(arr);
        });

        it("should handle basic constant values" + testSuffix, () => {
            const arr = [null, false, true, undefined];
            const encoded = encodeAnyArray(arr, safer);
            expect(encoded).toBe("nftu");
            const decoded = decodeAnyArray(encoded);
            expect(decoded).toEqual(arr);
        });

        it("should handle numbers" + testSuffix, () => {
            const arr = [0, 123, 123456789, -10];
            const encoded = encodeAnyArray(arr, safer);
            const decoded = decodeAnyArray(encoded);
            expect(decoded).toEqual(arr);
        });

        it("should handle strings" + testSuffix, () => {
            const arr = ["", "hello", "a string with spaces", '{"key":"value"}'];
            const encoded = encodeAnyArray(arr, safer);
            const decoded = decodeAnyArray(encoded);
            expect(decoded).toEqual(arr);
        });

        it("should handle objects" + testSuffix, () => {
            const arr = [{}, { a: 1 }, { a: 1, b: { c: "test" } }];
            const encoded = encodeAnyArray(arr, safer);
            const decoded = decodeAnyArray(encoded);
            expect(decoded).toEqual(arr);
        });

        it("should handle arrays as object elements" + testSuffix, () => {
            const arr = [[], [1, 2, 3], ["a", "b"]];
            const encoded = encodeAnyArray(arr, safer);
            const decoded = decodeAnyArray(encoded);
            expect(decoded).toEqual(arr);
        });

        it("should handle a mix of types" + testSuffix, () => {
            const arr = [
                "hello",
                123,
                true,
                null,
                { a: "world", b: [1, false] },
                undefined,
                1.2345,
                7e1,
                -987,
                "another string",
            ];
            const encoded = encodeAnyArray(arr, safer);
            const decoded = decodeAnyArray(encoded);
            expect(decoded).toEqual(arr);
        });

        it("should throw an error for invalid encoded string" + testSuffix, () => {
            const invalidStr = "V1a_"; // Invalid character '_'
            expect(() => decodeAnyArray(invalidStr)).toThrow();
        });

        it("should handle long strings that require 2-digit base36 length" + testSuffix, () => {
            const longString = "a".repeat(50);
            const arr = [longString];
            const encoded = encodeAnyArray(arr, safer);
            const decoded = decodeAnyArray(encoded);
            expect(decoded).toEqual(arr);
        });

        it("should handle large numbers that require 2-digit base36 length" + testSuffix, () => {
            const largeNumber = Number.MAX_SAFE_INTEGER;
            const arr = [largeNumber];
            const encoded = encodeAnyArray(arr, safer);
            const decoded = decodeAnyArray(encoded);
            expect(decoded).toEqual(arr);
        });

        it("should throw an error for string/object length that exceeds encodable length" + testSuffix, () => {
            // 36^5 - 1 is the max length
            const maxLength = Math.pow(36, 5) - 1;
            const tooLongString = "a".repeat(maxLength + 1);
            expect(() => encodeAnyArray([tooLongString], safer)).toThrow(
                "String/Object length exceeds maximum encodable length of 5 in base36."
            );
        });
        it("should handle some specific edge cases" + testSuffix, () => {
            const arr = [undefined, null, 0, "", false, { a: undefined, b: null }, [undefined, null]];
            const encoded = encodeAnyArray(arr, safer);
            const decoded = decodeAnyArray(encoded);
            expect(decoded).toEqual(arr);
        });
        it("should handle nested objects and arrays" + testSuffix, () => {
            const arr = [
                {
                    a: [1, 2, { b: "text", c: [true, false, null] }],
                    d: { e: "string", f: 456 },
                },
                [{ g: undefined }, [null, 789]],
            ];
            const encoded = encodeAnyArray(arr, safer);
            const decoded = decodeAnyArray(encoded);
            expect(decoded).toEqual(arr);
        });
        it("should handle _ and ^ strings correctly" + testSuffix, () => {
            const arr = [
                "_leadingUnderscore",
                "^leadingCaret",
                { key: "_objectWithUnderscore" },
                { key: "^objectWithCaret" },
            ];
            const encoded = encodeAnyArray(arr, safer);
            const decoded = decodeAnyArray(encoded);
            expect(decoded).toEqual(arr);
        });
    }
});
