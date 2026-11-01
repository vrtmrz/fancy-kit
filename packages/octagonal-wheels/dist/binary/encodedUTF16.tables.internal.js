/** Byte-to-code-unit mapping retained by the legacy UTF-16 encoder. */
const encodeTable = {};
/** Code-unit-to-byte mapping used to read the legacy UTF-16 format. */
const decodeTable = {};
for (let byte = 0; byte < 256; byte++) {
    const encoded = byte + 0xc0;
    encodeTable[byte] = encoded;
    decodeTable[encoded] = byte;
}

export { decodeTable, encodeTable };
//# sourceMappingURL=encodedUTF16.tables.internal.js.map
