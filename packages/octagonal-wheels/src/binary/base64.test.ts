import { describe, it, expect } from "vitest";
import {
    // base64ToArrayBuffer,
    // arrayBufferToBase64,
    // arrayBufferToBase64Single,
    base64ToArrayBufferBrowser,
    base64ToArrayBufferNative,
    arrayBufferToBase64Browser,
    arrayBufferToBase64Native,
    arrayBufferToBase64SingleBrowser,
    arrayBufferToBase64SingleNative,
    writeString,
    readString,
    // base64ToString,
    base64ToStringBrowser,
    base64ToStringNative,
    tryConvertBase64ToArrayBufferBrowser,
    tryConvertBase64ToArrayBufferNative,
    // tryConvertBase64ToArrayBuffer,
} from "./base64.ts";

describe("Base64", () => {
    const pairs = {
        native: {
            base64ToArrayBuffer: base64ToArrayBufferNative,
            arrayBufferToBase64: arrayBufferToBase64Native,
            arrayBufferToBase64Single: arrayBufferToBase64SingleNative,
            base64ToString: base64ToStringNative,
            tryConvertBase64ToArrayBuffer: tryConvertBase64ToArrayBufferNative,
        },
        browser: {
            base64ToArrayBuffer: base64ToArrayBufferBrowser,
            arrayBufferToBase64: arrayBufferToBase64Browser,
            arrayBufferToBase64Single: arrayBufferToBase64SingleBrowser,
            base64ToString: base64ToStringBrowser,
            tryConvertBase64ToArrayBuffer: tryConvertBase64ToArrayBufferBrowser,
        },
    };
    for (const [envName, funcs] of Object.entries(pairs)) {
        describe(`Test for ${envName}`, () => {
            const {
                base64ToArrayBuffer,
                arrayBufferToBase64,
                arrayBufferToBase64Single,
                base64ToString,
                tryConvertBase64ToArrayBuffer,
            } = funcs;
            describe("base64ToArrayBuffer", () => {
                it("should return an ArrayBuffer when given a valid base64 string", () => {
                    const base64 = "SGVsbG8gd29ybGQ="; // "Hello world" in base64
                    const result = base64ToArrayBuffer(base64);
                    expect(result).to.be.an.instanceOf(ArrayBuffer);
                    const r = readString(new Uint8Array(result));
                    expect(r).to.equal("Hello world");
                });

                it("should return an empty ArrayBuffer when given an empty base64 string", () => {
                    const base64 = "";
                    const result = base64ToArrayBuffer(base64);
                    expect(result.byteLength).to.equal(0);
                });

                it("should return an empty ArrayBuffer when given an invalid base64 string", () => {
                    const base64 = "****InvalidBase64String";
                    const result = base64ToArrayBuffer(base64);
                    expect(result.byteLength).to.equal(0);
                });

                it("should return the correct ArrayBuffer when given an array of valid base64 strings", () => {
                    const base64Array = ["SGVsbG8gd29ybGQ=", "VGhpcyBpcyBhIG5lZWQgdG8gYmFzZTY0IGVuY29kaW5n"];
                    const result = base64ToArrayBuffer(base64Array);
                    expect(result).to.be.an.instanceOf(ArrayBuffer);
                    const r = readString(new Uint8Array(result));
                    expect(r).to.equal("Hello worldThis is a need to base64 encoding");
                });

                it("should return an empty ArrayBuffer when given an array of empty base64 strings", () => {
                    const base64Array = ["", ""];
                    const result = base64ToArrayBuffer(base64Array);
                    expect(result.byteLength).to.equal(0);
                });

                it("should return an empty ArrayBuffer when given an array of invalid base64 strings", () => {
                    const base64Array = ["**InvalidBase64String1", "**InvalidBase64String2"];
                    const result = base64ToArrayBuffer(base64Array);
                    expect(result.byteLength).to.equal(0);
                });
            });
            describe("arrayBufferToBase64", () => {
                it("should return an empty array when given an empty ArrayBuffer", async () => {
                    const buffer = new ArrayBuffer(0);
                    const result = await arrayBufferToBase64(buffer);
                    expect(result).to.be.an("array");
                    expect(result.length).toBe(1);
                    expect(result[0]).to.equal("");
                });

                it("should return the same base64 string when given a single-byte ArrayBuffer", async () => {
                    const buffer = new Uint8Array([65]).buffer; // 'A' in ASCII
                    const result = await arrayBufferToBase64(buffer);
                    expect(result).to.be.an("array").that.has.lengthOf(1);
                    expect(result[0]).to.equal("QQ==");
                });

                it("should return the same base64 string when given a small ArrayBuffer", async () => {
                    const buffer = new Uint8Array([72, 101, 108, 108, 111]).buffer; // 'Hello' in ASCII
                    const result = await arrayBufferToBase64(buffer);
                    expect(result).to.be.an("array").that.has.lengthOf(1);
                    expect(result[0]).to.equal("SGVsbG8=");
                });
            });
            describe("arrayBufferToBase64Single", () => {
                it("should return a single base64 string when given a valid ArrayBuffer", async () => {
                    const buffer = new ArrayBuffer(10);
                    const result = await arrayBufferToBase64Single(buffer);
                    expect(result).to.be.a("string");
                });

                it("should return an empty string when given an empty ArrayBuffer", async () => {
                    const buffer = new ArrayBuffer(0);
                    const result = await arrayBufferToBase64Single(buffer);
                    expect(result).to.equal("");
                });

                it("should return the correct base64 string when given a single-byte ArrayBuffer", async () => {
                    const buffer = new Uint8Array([65]).buffer; // 'A' in ASCII
                    const result = await arrayBufferToBase64Single(buffer);
                    expect(result).to.equal("QQ==");
                });

                it("should return the correct base64 string when given a small ArrayBuffer", async () => {
                    const buffer = new Uint8Array([72, 101, 108, 108, 111]).buffer; // 'Hello' in ASCII
                    const result = await arrayBufferToBase64Single(buffer);
                    expect(result).to.equal("SGVsbG8=");
                });
            });
            describe("writeString", () => {
                it("should return a Uint8Array with the correct length when given a string", () => {
                    const input = "Hello world";
                    const result = writeString(input);
                    expect(result).to.be.an.instanceOf(Uint8Array);
                    expect(result.length).to.equal(input.length);
                });

                it("should return a Uint8Array with the correct values when given a string", () => {
                    const input = "Hello world";
                    const expected = new Uint8Array([72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100]);
                    const result = writeString(input);
                    expect(result).to.be.an.instanceOf(Uint8Array);
                    expect(result).to.deep.equal(expected);
                });

                it("should return an empty Uint8Array when given an empty string", () => {
                    const input = "";
                    const result = writeString(input);
                    expect(result).to.be.an.instanceOf(Uint8Array);
                    expect(result.length).to.equal(0);
                });
            });
            describe("readString", () => {
                it("should return an empty string when given an empty Uint8Array", () => {
                    const buffer = new Uint8Array([]);
                    const result = readString(buffer);
                    expect(result).to.equal("");
                });

                it("should return the correct string when given a Uint8Array with ASCII characters", () => {
                    const buffer = new Uint8Array([72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100]); // 'Hello world' in ASCII
                    const result = readString(buffer);
                    expect(result).to.equal("Hello world");
                });

                it("should return the correct string when given a Uint8Array with non-ASCII characters", () => {
                    const buffer = new Uint8Array([227, 129, 130, 227, 129, 132, 227, 129, 134]); // 'あいう' in UTF-8
                    const result = readString(buffer);
                    expect(result).to.equal("あいう");
                });
            });
            describe("base64ToString", () => {
                it("should return the correct string when given a valid base64 string", () => {
                    const base64 = "SGVsbG8gd29ybGQ="; // "Hello world" in base64
                    const result = base64ToString(base64);
                    expect(result).to.equal("Hello world");
                });

                it("should return an empty string when given an empty base64 string", () => {
                    const base64 = "";
                    const result = base64ToString(base64);
                    expect(result).to.equal("");
                });

                it("should return the correct string when given an array of valid base64 strings", () => {
                    const base64Array = ["SGVsbG8gd29ybGQ=", "VGhpcyBpcyBhIG5lc3RlZCBiYXNlNjQgZW5jb2Rpbmc="];
                    const result = base64ToString(base64Array);
                    expect(result).to.equal("Hello worldThis is a nested base64 encoding");
                });

                it("should return the same string when given a non-base64 string", () => {
                    const base64 = "**InvalidBase64String";
                    const result = base64ToString(base64);
                    expect(result).to.equal(base64);
                });

                it("should return the correct string when given an array with a mix of valid and non-base64 strings", () => {
                    const base64Array = ["SGVsbG8gd29ybGQ=", "**InvalidBase64String"];
                    const result = base64ToString(base64Array);
                    expect(result).to.equal("Hello world**InvalidBase64String");
                });
            });

            describe("Binary conversion combined", () => {
                it("using all functions", async () => {
                    const testString = "ABĆC😀😀😀彅ࢡ彅彅𐎀бβ".repeat(1024000);
                    const buffer = writeString(testString);
                    const base64 = await arrayBufferToBase64(buffer);
                    const base64String = await arrayBufferToBase64Single(buffer);
                    const result = base64ToArrayBuffer(base64);
                    const resultString = readString(new Uint8Array(result));
                    expect(base64String).to.equal(base64.join(""));
                    expect(resultString).to.equal(testString);
                    expect(base64ToString(base64)).to.equal(testString);
                    expect(buffer).to.deep.equal(new Uint8Array(result));
                });
            });
            describe("tryConvertBase64ToArrayBuffer", () => {
                it("should return the converted ArrayBuffer when given a valid base64 string", () => {
                    const base64 = "SGVsbG8gd29ybGQ="; // "Hello world" in base64
                    const result = tryConvertBase64ToArrayBuffer(base64);
                    expect(result).to.be.an.instanceOf(ArrayBuffer);
                    const r = readString(new Uint8Array(result as ArrayBuffer));
                    expect(r).to.equal("Hello world");
                });

                it("should return false when given an invalid base64 string", () => {
                    const base64 = "****InvalidBase64String";
                    const result = tryConvertBase64ToArrayBuffer(base64);
                    expect(result).to.equal(false);
                });
            });
        });
    }
});
