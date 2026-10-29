import { arrayBufferToBase64Single } from './base64.js';

/**
 * Creates a new plain-text Blob from a string or ordered string parts.
 *
 * @param data - Text parts, concatenated without a separator.
 * @returns A new Blob with the exact MIME type `text/plain`.
 * @remarks
 * Line endings remain unchanged. Each part uses the native Blob constructor's
 * string conversion, including replacement of unpaired UTF-16 surrogates.
 * Requires the standard global Blob constructor when called.
 */
function createTextBlob(data) {
    const parts = Array.isArray(data) ? data : [data];
    return new Blob(parts, { endings: "transparent", type: "text/plain" });
}
/**
 * Creates a new binary Blob containing a snapshot of the supplied bytes.
 *
 * @param data - An ArrayBuffer or a Uint8Array backed by an ArrayBuffer.
 * @returns A new Blob with the exact MIME type `application/octet-stream`.
 * @remarks
 * A Uint8Array contributes only its visible byte range, not its entire backing
 * buffer. Later changes to the input bytes do not change the Blob.
 * Requires the standard global Blob constructor when called.
 */
function createBinaryBlob(data) {
    return new Blob([data], { endings: "transparent", type: "application/octet-stream" });
}
/**
 * Normalises text, binary data, or an existing Blob to a Blob.
 *
 * @param data - Text, ordered text parts, binary bytes, or an existing Blob.
 * @returns The original Blob, or a new text or binary Blob for other inputs.
 * @remarks
 * Existing Blob instances retain their identity, MIME type, and bytes. Text
 * uses {@link createTextBlob}; an ArrayBuffer or Uint8Array uses
 * {@link createBinaryBlob}. No decoding or content inspection is performed.
 * Instance checks use the current realm's global constructors. The focused
 * module can be imported without DOM or fetch globals; calls require Blob.
 */
function toBlob(data) {
    if (data instanceof Blob)
        return data;
    if (data instanceof Uint8Array || data instanceof ArrayBuffer)
        return createBinaryBlob(data);
    return createTextBlob(data);
}
async function isArrayBufferContentEqual(left, right) {
    return (await arrayBufferToBase64Single(left)) === (await arrayBufferToBase64Single(right));
}
/**
 * Tests whether two Blobs contain equal bytes, independently of their MIME types.
 *
 * @param left - The first Blob. Use {@link toBlob} to normalise other inputs.
 * @param right - The second Blob.
 * @param isArrayBufferEqual - Equality predicate for each pair of parts. Defaults
 * to comparing their Base64 encodings through `arrayBufferToBase64Single`.
 * @returns Whether the sizes and all corresponding parts are equal.
 * @remarks
 * Different sizes return false without reading content or calling the
 * predicate. Empty Blobs return true without reading or calling the predicate.
 * Equal sizes are read sequentially, in parts of at most 10,000 bytes: first
 * the left part, then the right part, then the equality predicate. The next
 * pair is read only after that predicate resolves true. Reads use sliced parts
 * rather than calling `arrayBuffer()` on the original Blobs. The function does
 * not select IndexedDB or inspect metadata.
 * Read failures and predicate failures propagate unchanged. A custom predicate
 * is responsible for deciding byte equality and for its own working memory.
 */
async function isBlobContentEqual(left, right, isArrayBufferEqual = isArrayBufferContentEqual) {
    if (left.size !== right.size)
        return false;
    const checkQuantum = 10000;
    const length = left.size;
    let offset = 0;
    while (offset < length) {
        const leftPart = await left.slice(offset, offset + checkQuantum).arrayBuffer();
        const rightPart = await right.slice(offset, offset + checkQuantum).arrayBuffer();
        offset += checkQuantum;
        if (!(await isArrayBufferEqual(leftPart, rightPart)))
            return false;
    }
    return true;
}

export { createBinaryBlob, createTextBlob, isBlobContentEqual, toBlob };
//# sourceMappingURL=blob.js.map
