import { describe, expect, it } from "vitest";
import { toArrayBuffer } from "./arrayBuffer.ts";

describe("toArrayBuffer", () => {
    it("returns an ArrayBuffer unchanged", () => {
        const source = new ArrayBuffer(8);
        expect(toArrayBuffer(source)).toBe(source);
    });

    it("reuses an ArrayBuffer-backed view only when it covers the complete buffer", () => {
        const source = new Uint8Array([1, 2, 3, 4]);
        expect(toArrayBuffer(source)).toBe(source.buffer);
    });

    it("copies exactly the bytes of a non-zero-offset typed-array view", () => {
        const source = new Uint8Array([99, 1, 2, 3, 88]);
        const view = source.subarray(1, 4);
        const result = toArrayBuffer(view);

        expect([...new Uint8Array(result)]).toEqual([1, 2, 3]);
        expect(result).not.toBe(source.buffer);

        source[2] = 42;
        expect([...new Uint8Array(result)]).toEqual([1, 2, 3]);
    });

    it("uses byteOffset and byteLength for DataView ranges", () => {
        const source = new Uint8Array([99, 10, 20, 30, 88]);
        const view = new DataView(source.buffer, 1, 3);
        expect([...new Uint8Array(toArrayBuffer(view))]).toEqual([10, 20, 30]);
    });

    it("preserves the byte representation of non-byte typed arrays", () => {
        const source = new Uint16Array([0x0102, 0x0304]);
        const expected = [...new Uint8Array(source.buffer, source.byteOffset, source.byteLength)];
        expect([...new Uint8Array(toArrayBuffer(source))]).toEqual(expected);
    });

    it("returns an empty buffer for an empty view over a non-empty backing buffer", () => {
        const source = new Uint8Array([1, 2, 3]);
        const empty = source.subarray(1, 1);
        expect(toArrayBuffer(empty).byteLength).toBe(0);
    });

    it("copies a SharedArrayBuffer-backed view into an ArrayBuffer", () => {
        if (typeof SharedArrayBuffer === "undefined") return;
        const shared = new SharedArrayBuffer(5);
        const source = new Uint8Array(shared);
        source.set([99, 1, 2, 3, 88]);

        const result = toArrayBuffer(source.subarray(1, 4));
        expect(result).toBeInstanceOf(ArrayBuffer);
        expect([...new Uint8Array(result)]).toEqual([1, 2, 3]);
    });
});
