/**
 * Concatenates multiple Uint8Array arrays into a single Uint8Array.
 *
 * @param arrays - An array of Uint8Array arrays to be concatenated.
 * @returns A new Uint8Array containing the concatenated values.
 */
export declare function concatUInt8Array(arrays: Uint8Array[]): Uint8Array<ArrayBuffer>;
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
export declare function decodeBinary(src: string | string[]): ArrayBuffer;
/**
 * Encodes a binary data into a string array using base64 encoding.
 *
 * @param src - The binary data to be encoded. It can be either a Uint8Array or an ArrayBuffer.
 * @returns A promise that resolves to a string array representing the encoded binary data.
 */
export declare function encodeBinary(src: Uint8Array<ArrayBuffer> | ArrayBuffer): Promise<string[]>;
export * from "./base64.ts";
export * from "./encodedUTF16.ts";
export * from "./hex.ts";
