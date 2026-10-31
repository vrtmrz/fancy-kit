import { decodeTable } from "./encodedUTF16.tables.internal.ts";

export { encodeBinaryEach, _encodeBinary } from "./encodedUTF16.deprecated.ts";

/** Decodes ordered legacy UTF-16 parts into their original bytes. */
export function decodeToArrayBuffer(src: string[]) {
    if (src.length == 1) return _decodeToArrayBuffer(src[0]);
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

/** Decodes one legacy UTF-16 part into its original bytes. */
export function _decodeToArrayBuffer(src: string): ArrayBuffer {
    const out = new Uint8Array(src.length);
    const len = src.length;
    for (let i = 0; i < len; i++) {
        // We can simply pick a char, because of it does not contains surrogate pair or any of like them.
        const char = src.charCodeAt(i);
        if (char >= 0x26 && char <= 0x7e && char != 0x3a) {
            out[i] = char;
        } else {
            out[i] = decodeTable[char];
        }
    }
    return out.buffer;
}
