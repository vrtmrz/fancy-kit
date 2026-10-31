import { describe, expect, it } from "vitest";
import { _decodeToArrayBuffer, decodeToArrayBuffer } from "./encodedUTF16.ts";
import { decodeBinary } from "./index.ts";

const encoded = "\u00c0\u00e5&\u00faA~\u013f\u0140\u01be\u01bf";
const parts = ["\u00c0\u00e5&\u00fa", "A~", "\u013f\u0140\u01be\u01bf"];
const expected = new Uint8Array([0, 0x25, 0x26, 0x3a, 0x41, 0x7e, 0x7f, 0x80, 0xfe, 0xff]);

describe("legacy UTF-16 decoding", () => {
    it("decodes fixed byte values at the literal and escaped alphabet boundaries", () => {
        expect(new Uint8Array(_decodeToArrayBuffer(encoded))).toEqual(expected);
    });

    it("decodes a single part with the same fixed byte values", () => {
        expect(new Uint8Array(decodeToArrayBuffer([encoded]))).toEqual(expected);
    });

    it("concatenates decoded parts in order across escaped and literal boundaries", () => {
        expect(new Uint8Array(decodeToArrayBuffer(parts))).toEqual(expected);
    });

    it("accepts empty text and empty parts", () => {
        expect(new Uint8Array(_decodeToArrayBuffer(""))).toEqual(new Uint8Array());
        expect(new Uint8Array(decodeToArrayBuffer([]))).toEqual(new Uint8Array());
        expect(new Uint8Array(decodeToArrayBuffer(["", ""]))).toEqual(new Uint8Array());
    });

    it("reads a percent-prefixed legacy document through the public binary entry", () => {
        expect(new Uint8Array(decodeBinary("%" + encoded))).toEqual(expected);
        expect(new Uint8Array(decodeBinary(["%" + parts[0]!, ...parts.slice(1)]))).toEqual(expected);
    });
});
