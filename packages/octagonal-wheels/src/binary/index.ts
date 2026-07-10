import { arrayBufferToBase64, base64ToArrayBuffer } from "./base64.ts";
import { _decodeToArrayBuffer, decodeToArrayBuffer } from "./encodedUTF16.ts";

/**
 * Concatenates multiple Uint8Array arrays into a single Uint8Array.
 *
 * @param arrays - An array of Uint8Array arrays to be concatenated.
 * @returns A new Uint8Array containing the concatenated values.
 */
export function concatUInt8Array(arrays: Uint8Array[]): Uint8Array<ArrayBuffer> {
    const length = arrays.reduce((acc, cur) => acc + cur.length, 0);
    const result = new Uint8Array(length);
    let pos = 0;
    for (const array of arrays) {
        result.set(array, pos);
        pos += array.length;
    }
    return result;
}

/**
 * Decodes a binary string or an array of binary strings into an ArrayBuffer.
 * If the input is an empty string or array, it returns an empty ArrayBuffer.
 * If the input starts with '%', it decodes the string(s) using `_decodeToArrayBuffer` function.
 * Otherwise, it decodes the string(s) using `base64ToArrayBuffer` function.
 *
 * @param src - The binary string or array of binary strings to decode.
 * @returns The decoded ArrayBuffer.
 * @remarks Now, Self-hosted LiveSync always use base64 for encoding/decoding.
 */
export function decodeBinary(src: string | string[]) {
    if (src.length == 0) return new Uint8Array().buffer;
    if (typeof src === "string") {
        if (src[0] === "%") {
            return _decodeToArrayBuffer(src.substring(1));
        }
    } else {
        if (src[0][0] === "%") {
            const [head, ...last] = src;
            return decodeToArrayBuffer([head.substring(1), ...last]);
        }
    }
    return base64ToArrayBuffer(src);
}

/**
 * Encodes a binary data into a string array using base64 encoding.
 *
 * @param src - The binary data to be encoded. It can be either a Uint8Array or an ArrayBuffer.
 * @returns A promise that resolves to a string array representing the encoded binary data.
 */
export async function encodeBinary(src: Uint8Array<ArrayBuffer> | ArrayBuffer): Promise<string[]> {
    return await arrayBufferToBase64(src);
}

export * from "./base64.ts";
export * from "./encodedUTF16.ts";
export * from "./hex.ts";
