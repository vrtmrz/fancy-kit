import { expect, test, describe } from "vitest";
import {
    hexStringToUint8ArrayBrowser,
    uint8ArrayToHexStringBrowser,
    hexStringToUint8ArrayNative,
    uint8ArrayToHexStringNative,
} from "./hex.ts";

const pairs = {
    native: {
        uint8ArrayToHexString: uint8ArrayToHexStringNative,
        hexStringToUint8Array: hexStringToUint8ArrayNative,
    },
    browser: {
        uint8ArrayToHexString: uint8ArrayToHexStringBrowser,
        hexStringToUint8Array: hexStringToUint8ArrayBrowser,
    },
};
describe("hex conversion", () => {
    for (const [name, funcs] of Object.entries(pairs)) {
        const { uint8ArrayToHexString, hexStringToUint8Array } = funcs;
        describe(`test for ${name}`, () => {
            test("should convert Uint8Array to hexadecimal string", () => {
                const input = new Uint8Array([0, 1, 2, 10, 15, 16, 255]);
                const expected = "0001020a0f10ff";
                const result = uint8ArrayToHexString(input);
                expect(result).toBe(expected);
            });

            test("should handle empty Uint8Array", () => {
                const input = new Uint8Array([]);
                const expected = "";
                const result = uint8ArrayToHexString(input);
                expect(result).toBe(expected);
            });

            test("should handle Uint8Array with single element", () => {
                const input = new Uint8Array([255]);
                const expected = "ff";
                const result = uint8ArrayToHexString(input);
                expect(result).toBe(expected);
            });
            test("should convert hexadecimal string to Uint8Array", () => {
                const input = "0001020a0f10ff";
                const expected = new Uint8Array([0, 1, 2, 10, 15, 16, 255]);
                const result = hexStringToUint8Array(input);
                expect(result).toEqual(expected);
            });

            test("should handle empty hexadecimal string", () => {
                const input = "";
                const expected = new Uint8Array([]);
                const result = hexStringToUint8Array(input);
                expect(result).toEqual(expected);
            });
        });
    }
});
