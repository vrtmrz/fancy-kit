/**
 * Encodes a binary buffer into a UTF-16 string.
 *
 * @param buffer - The binary buffer to encode.
 * @returns A promise that resolves to the encoded UTF-16 string.
 * @deprecated This function is not recommended for use.
 */
export declare function encodeBinaryEach(buffer: Uint8Array): Promise<string>;
/**
 * Encodes a binary buffer into an array of strings.
 * If the buffer length is less than BINARY_CHUNK_MAX, it encodes the entire buffer into a single string.
 * If the buffer length is greater than or equal to BINARY_CHUNK_MAX, it splits the buffer into chunks and encodes each chunk into a separate string.
 * @param buffer The binary buffer to encode.
 * @returns A promise that resolves to an array of encoded strings.
 * @deprecated Use `encodeBinary` instead. `encodeBinary` uses a base64 encoding, which is more efficient and reliable.
 */
export declare function _encodeBinary(buffer: Uint8Array): Promise<string[]>;
export declare function decodeToArrayBuffer(src: string[]): ArrayBuffer;
export declare function _decodeToArrayBuffer(src: string): ArrayBuffer;
