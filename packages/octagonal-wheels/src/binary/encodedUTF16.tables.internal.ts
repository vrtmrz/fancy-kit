/** Byte-to-code-unit mapping retained by the legacy UTF-16 encoder. */
export const encodeTable = {} as Record<number, number>;
/** Code-unit-to-byte mapping used to read the legacy UTF-16 format. */
export const decodeTable = {} as Record<number, number>;

for (let byte = 0; byte < 256; byte++) {
    const encoded = byte + 0xc0;
    encodeTable[byte] = encoded;
    decodeTable[encoded] = byte;
}
