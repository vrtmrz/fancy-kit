import { range } from '../collection.js';

const BINARY_CHUNK_MAX = 1024 * 1024 * 30;
// Table for converting encoding binary
const table = {};
const revTable = {};
const decoderStreamAvailable = typeof TextDecoderStream !== "undefined";
[...range(0xc0, 0x1bf)].forEach((e, i) => {
    table[i] = e;
    revTable[e] = i;
});
/**
 * Encodes a binary buffer into a UTF-16 string.
 *
 * @param buffer - The binary buffer to encode.
 * @returns A promise that resolves to the encoded UTF-16 string.
 * @deprecated This function is not recommended for use.
 */
async function encodeBinaryEach(buffer) {
    const len = buffer.byteLength;
    const out = new Uint16Array(buffer);
    for (let i = 0; i < len; i++) {
        const char = buffer[i];
        if (char >= 0x26 && char <= 0x7e && char != 0x3a) ;
        else {
            out[i] = table[char];
        }
    }
    // Return it as utf-16 string.
    return await decodeAsync(out);
}
/**
 * Encodes a binary buffer into an array of strings.
 * If the buffer length is less than BINARY_CHUNK_MAX, it encodes the entire buffer into a single string.
 * If the buffer length is greater than or equal to BINARY_CHUNK_MAX, it splits the buffer into chunks and encodes each chunk into a separate string.
 * @param buffer The binary buffer to encode.
 * @returns A promise that resolves to an array of encoded strings.
 * @deprecated Use `encodeBinary` instead. `encodeBinary` uses a base64 encoding, which is more efficient and reliable.
 */
async function _encodeBinary(buffer) {
    const len = buffer.length;
    if (len < BINARY_CHUNK_MAX) {
        return [await encodeBinaryEach(buffer)];
    }
    const out = [];
    for (let i = 0; i < len; i += BINARY_CHUNK_MAX) {
        out.push(encodeBinaryEach(buffer.subarray(i, i + BINARY_CHUNK_MAX)));
    }
    return Promise.all(out);
}
async function decodeAsync(buffer) {
    if (buffer.length == 0)
        return "";
    if (!decoderStreamAvailable)
        return await decodeAsyncReader(buffer);
    const decoderStream = new TextDecoderStream("utf-16");
    const writer = decoderStream.writable.getWriter();
    await writer.write(buffer);
    await writer.close();
    const reader = decoderStream.readable.getReader();
    const result = await reader.read();
    if (!result.value) {
        throw new Error("UTF-16 Parse error");
    }
    return result.value;
}
function decodeAsyncReader(buffer) {
    return new Promise((res, rej) => {
        const blob = new Blob([buffer], { type: "application/octet-binary" });
        const reader = new FileReader();
        reader.onload = function (evt) {
            const result = evt.target?.result;
            if (!result)
                return rej("UTF-16 Parse error");
            return res(result);
        };
        reader.readAsText(blob, "utf-16");
    });
}
function decodeToArrayBuffer(src) {
    if (src.length == 1)
        return _decodeToArrayBuffer(src[0]);
    const bufItems = src.map((e) => _decodeToArrayBuffer(e));
    const len = bufItems.reduce((p, c) => p + c.byteLength, 0);
    const joinedArray = new Uint8Array(len);
    let offset = 0;
    bufItems.forEach((e) => {
        joinedArray.set(new Uint8Array(e), offset);
        offset += e.byteLength;
    });
    return joinedArray.buffer;
}
function _decodeToArrayBuffer(src) {
    const out = new Uint8Array(src.length);
    const len = src.length;
    for (let i = 0; i < len; i++) {
        // We can simply pick a char, because of it does not contains surrogate pair or any of like them.
        const char = src.charCodeAt(i);
        if (char >= 0x26 && char <= 0x7e && char != 0x3a) {
            out[i] = char;
        }
        else {
            out[i] = revTable[char];
        }
    }
    return out.buffer;
}

export { _decodeToArrayBuffer, _encodeBinary, decodeToArrayBuffer, encodeBinaryEach };
//# sourceMappingURL=encodedUTF16.js.map
