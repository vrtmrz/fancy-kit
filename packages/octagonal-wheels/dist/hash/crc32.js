const crc32kTable = new Uint32Array(256);
const crc32cTable = new Uint32Array(256);
function generateCRC32KTable() {
    const polynomial = 0xedb88320;
    for (let i = 0; i < 256; i++) {
        let crc = i;
        for (let j = 0; j < 8; j++) {
            if (crc & 1) {
                crc = (crc >>> 1) ^ polynomial;
            }
            else {
                crc >>>= 1;
            }
        }
        crc32kTable[i] = crc;
    }
}
function generateCRC32CTable() {
    const polynomial = 0x1edc6f41;
    for (let i = 0; i < 256; i++) {
        let crc = i;
        for (let j = 0; j < 8; j++) {
            if (crc & 1) {
                crc = (crc >>> 1) ^ polynomial;
            }
            else {
                crc >>>= 1;
            }
        }
        crc32cTable[i] = crc;
    }
}
generateCRC32CTable();
generateCRC32KTable();
function crc32CHash(strSrc) {
    let crc = 0xffffffff;
    const src = `s0` + strSrc + `\u0012\u0009` + strSrc.length;
    let i = src.length;
    while (--i) {
        const code = src.charCodeAt(i);
        const codeLow = code & 0xff;
        const codeHigh = code >> 8;
        crc = (crc >>> 8) ^ crc32cTable[(crc ^ codeLow) & 0xff];
        crc = (crc >>> 8) ^ crc32cTable[(crc ^ codeHigh) & 0xff];
    }
    crc ^= 0xffffffff;
    return crc.toString(32);
}
function crc32CKHash(strSrc) {
    let crc = 0xffffffff;
    let crc2 = 0xffffffff;
    const src = `s0` + strSrc + `\u0012\u0009` + strSrc.length;
    let i = src.length;
    while (--i) {
        const code = src.charCodeAt(i);
        const codeLow = code & 0xff;
        const codeHigh = code >> 8;
        crc = (crc >>> 8) ^ crc32cTable[(crc ^ codeLow) & 0xff];
        crc = (crc >>> 8) ^ crc32cTable[(crc ^ codeHigh) & 0xff];
        crc2 = (crc2 >>> 8) ^ crc32kTable[(crc2 ^ codeLow) & 0xff];
        crc2 = (crc2 >>> 8) ^ crc32kTable[(crc2 ^ codeHigh) & 0xff];
    }
    crc ^= 0xffffffff;
    crc2 ^= 0xffffffff;
    return crc.toString(32) + "-" + crc2.toString(32);
}

export { crc32CHash, crc32CKHash };
//# sourceMappingURL=crc32.js.map
