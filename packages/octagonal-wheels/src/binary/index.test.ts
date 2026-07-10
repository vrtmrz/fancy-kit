import { expect, test } from "vitest";
import { base64ToArrayBuffer } from "./base64.ts";
import { concatUInt8Array, decodeBinary, encodeBinary } from "./index.ts";
import { _decodeToArrayBuffer, decodeToArrayBuffer } from "./encodedUTF16.ts";

test("concatUInt8Array should concatenate multiple Uint8Array arrays into a single Uint8Array", () => {
    const array1 = new Uint8Array([1, 2, 3]);
    const array2 = new Uint8Array([4, 5]);
    const array3 = new Uint8Array([6, 7, 8, 9]);

    const result = concatUInt8Array([array1, array2, array3]);

    expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]));
});

test("decodeBinary should return an empty ArrayBuffer when input is an empty string", () => {
    const result = decodeBinary("");
    expect(result).toEqual(new Uint8Array().buffer);
});

test("decodeBinary should return an empty ArrayBuffer when input is an empty array", () => {
    const result = decodeBinary([]);
    expect(result).toEqual(new Uint8Array().buffer);
});

test('decodeBinary should decode a binary string starting with "%" using _decodeToArrayBuffer', () => {
    const src = "%SGVsbG8gd29ybGQh";
    const result = decodeBinary(src);
    const expected = _decodeToArrayBuffer("SGVsbG8gd29ybGQh");
    expect(result).toEqual(expected);
});

test('decodeBinary should decode an array of binary strings starting with "%" using decodeToArrayBuffer', () => {
    const src = ["%SGVsbG8gd29ybGQh", "%VGhpcyBpcyBhIG5lZWRzIHRvIGJlIHN0b3JlZCBhbmQgdGV4dC4="];
    const result = decodeBinary(src);
    const expected = decodeToArrayBuffer(["SGVsbG8gd29ybGQh", "VGhpcyBpcyBhIG5lZWRzIHRvIGJlIHN0b3JlZCBhbmQgdGV4dC4="]);
    expect(result).toEqual(expected);
});

test("decodeBinary should decode a binary string using base64ToArrayBuffer", () => {
    const src = "SGVsbG8gd29ybGQh";
    const result = decodeBinary(src);
    const expected = base64ToArrayBuffer(src);
    expect(result).toEqual(expected);
});

test("decodeBinary should decode an array of binary strings using base64ToArrayBuffer", () => {
    const src = ["SGVsbG8gd29ybGQh", "VGhpcyBpcyBhIG5lZWRzIHRvIGJlIHN0b3JlZCBhbmQgdGV4dC4="];
    const result = decodeBinary(src);
    const expected = base64ToArrayBuffer(src);
    expect(result).toEqual(expected);
});

test("encodeBinary should encode a Uint8Array into a string array using base64 encoding", async () => {
    const array = new Uint8Array([1, 2, 3, 4, 5]);
    const result = await encodeBinary(array);
    expect(result).toEqual(["AQIDBAU="]);
});
