// OK.
import { arrayToChunkedArray, createTypedArrayReader, range, unique } from "./collection.ts";
import { describe, expect, it, test } from "vitest";
import { concatUInt8Array } from "./collection.ts";

describe("unique function", () => {
    test("should return array with unique elements", () => {
        const array = [1, 2, 2, 3, 4, 4, 5];
        const result = unique(array);
        expect(result).to.deep.equal([1, 2, 3, 4, 5]);
    });
    test("should return array with unique elements (With some types)", () => {
        const array = [1, "A", 2, 3, 4, 4, 5, "A"];
        const result = unique(array);
        expect(result).to.deep.equal([1, "A", 2, 3, 4, 5]);
    });
});

describe("arrayToChunkedArray function", () => {
    test("should return an empty array when input array is empty", () => {
        const array: number[] = [];
        const chunkLength = 3;
        const result = [...arrayToChunkedArray(array, chunkLength)];
        expect(result).to.deep.equal([]);
    });

    test("should return the input array as a single chunk when chunk length is greater than or equal to the array length", () => {
        const array = [1, 2, 3, 4, 5];
        const chunkLength = 5;
        const result = [...arrayToChunkedArray(array, chunkLength)];
        expect(result).to.deep.equal([[1, 2, 3, 4, 5]]);
    });

    test("should return the input array split into chunks of the specified length", () => {
        const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const chunkLength = 3;
        const result = [...arrayToChunkedArray(array, chunkLength)];
        expect(result).to.deep.equal([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
    });
});

describe("range function", () => {
    test("should return an empty array when from is greater than to", () => {
        const from = 5;
        const to = 1;
        const result = [...range(from, to)];
        expect(result).to.deep.equal([]);
    });

    test("should return an array with a single element when from is equal to to", () => {
        const from = 5;
        const to = 5;
        const result = [...range(from, to)];
        expect(result).to.deep.equal([5]);
    });

    test("should return a sequence of numbers from from to to (inclusive)", () => {
        const from = 1;
        const to = 5;
        const result = [...range(from, to)];
        expect(result).to.deep.equal([1, 2, 3, 4, 5]);
    });
});

describe("createTypedArrayReader", () => {
    it("reads specified length from Uint8Array", () => {
        const arr = new Uint8Array([10, 20, 30, 40, 50]);
        const reader = createTypedArrayReader(arr);
        const first = reader.read(2);
        expect(Array.from(first)).toEqual([10, 20]);
        const second = reader.read(2);
        expect(Array.from(second)).toEqual([30, 40]);
    });

    it("reads all remaining elements", () => {
        const arr = new Uint16Array([100, 200, 300, 400]);
        const reader = createTypedArrayReader(arr);
        reader.read(1);
        const all = reader.readAll();
        expect(Array.from(all)).toEqual([200, 300, 400]);
    });

    it("returns empty array if readAll is called after all elements read", () => {
        const arr = new Int8Array([1, 2, 3]);
        const reader = createTypedArrayReader(arr);
        reader.read(3);
        const all = reader.readAll();
        expect(Array.from(all)).toEqual([]);
    });

    it("works with Float32Array", () => {
        const arr = new Float32Array([1.5, 2.5, 3.5]);
        const reader = createTypedArrayReader(arr);
        const first = reader.read(1);
        expect(Array.from(first)).toEqual([1.5]);
        const all = reader.readAll();
        expect(Array.from(all)).toEqual([2.5, 3.5]);
    });

    it("does not check bounds, may return fewer elements if length exceeds", () => {
        const arr = new Uint8Array([7, 8]);
        const reader = createTypedArrayReader(arr);
        const result = reader.read(5);
        expect(Array.from(result)).toEqual([7, 8]);
    });
});
describe("concatUInt8Array", () => {
    it("returns an empty Uint8Array when given an empty array", () => {
        const result = concatUInt8Array([]);
        expect(Array.from(result)).toEqual([]);
    });

    it("returns the same array when given a single Uint8Array", () => {
        const arr = new Uint8Array([1, 2, 3]);
        const result = concatUInt8Array([arr]);
        expect(Array.from(result)).toEqual([1, 2, 3]);
    });

    it("concatenates multiple Uint8Arrays correctly", () => {
        const arr1 = new Uint8Array([1, 2]);
        const arr2 = new Uint8Array([3, 4]);
        const arr3 = new Uint8Array([5]);
        const result = concatUInt8Array([arr1, arr2, arr3]);
        expect(Array.from(result)).toEqual([1, 2, 3, 4, 5]);
    });

    it("handles arrays with empty Uint8Arrays", () => {
        const arr1 = new Uint8Array([]);
        const arr2 = new Uint8Array([10, 20]);
        const arr3 = new Uint8Array([]);
        const result = concatUInt8Array([arr1, arr2, arr3]);
        expect(Array.from(result)).toEqual([10, 20]);
    });

    it("handles all empty Uint8Arrays", () => {
        const result = concatUInt8Array([new Uint8Array([]), new Uint8Array([])]);
        expect(Array.from(result)).toEqual([]);
    });

    it("handles large arrays", () => {
        const arr1 = new Uint8Array([1, 2, 3, 4, 5]);
        const arr2 = new Uint8Array([6, 7, 8, 9, 10]);
        const result = concatUInt8Array([arr1, arr2]);
        expect(Array.from(result)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
});
