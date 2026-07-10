import { Logger, LOG_LEVEL_VERBOSE } from "../common/logger.ts";

const isProposalArrayBufferBase64Available =
    typeof Uint8Array !== "undefined" &&
    //@ts-ignore: Not typed in project target level
    typeof Uint8Array.prototype.toBase64 === "function" &&
    //@ts-ignore: Not typed in project target level
    typeof Uint8Array.fromBase64 === "function";

interface ExtendedUint8Array {
    toBase64: () => string;
    fromBase64: (base64: string) => Uint8Array<ArrayBuffer>;
}
/**
 * Converts a base64 string or an array of base64 strings to an ArrayBuffer using native methods.
 * @param base64 - The base64 string or an array of base64 strings to convert.
 * @returns The converted ArrayBuffer.
 */
export function base64ToArrayBufferNative(base64: string | string[]): ArrayBuffer {
    // if (base64 === "") return new ArrayBuffer(0);
    if (base64.length === 0) return new ArrayBuffer(0); // fix for empty array input or empty string input
    try {
        if (typeof base64 == "string") return (Uint8Array as unknown as ExtendedUint8Array).fromBase64(base64).buffer;
        const bufItems = base64.map((e) => (Uint8Array as unknown as ExtendedUint8Array).fromBase64(e).buffer);
        const len = bufItems.reduce((p, c) => p + c.byteLength, 0);
        const joinedArray = new Uint8Array(len);
        let offset = 0;
        bufItems.forEach((e) => {
            joinedArray.set(new Uint8Array(e), offset);
            offset += e.byteLength;
        });
        return joinedArray.buffer;
    } catch (ex) {
        Logger("Base64 Decode error", LOG_LEVEL_VERBOSE);
        Logger(ex, LOG_LEVEL_VERBOSE);
        return new ArrayBuffer(0);
    }
}

/**
 * Converts a base64 string or an array of base64 strings to an ArrayBuffer using browser-compatible methods.
 * @param base64 - The base64 string or an array of base64 strings to convert.
 * @returns The converted ArrayBuffer.
 */
export function base64ToArrayBufferBrowser(base64: string | string[]): ArrayBuffer {
    if (typeof base64 == "string") return base64ToArrayBufferInternalBrowser(base64);
    const bufItems = base64.map((e) => base64ToArrayBufferInternalBrowser(e));
    const len = bufItems.reduce((p, c) => p + c.byteLength, 0);
    const joinedArray = new Uint8Array(len);
    let offset = 0;
    bufItems.forEach((e) => {
        joinedArray.set(new Uint8Array(e), offset);
        offset += e.byteLength;
    });
    return joinedArray.buffer;
}

/**
 * Converts a base64 string or an array of base64 strings to an ArrayBuffer.
 * @param base64 - The base64 string or an array of base64 strings to convert.
 * @returns The converted ArrayBuffer.
 */
export const base64ToArrayBuffer = isProposalArrayBufferBase64Available
    ? base64ToArrayBufferNative
    : base64ToArrayBufferBrowser;

/**
 * Converts a base64 string to an ArrayBuffer in a browser environment.
 *
 * @param base64 - The base64 string to convert.
 * @returns The converted ArrayBuffer.
 */
export function base64ToArrayBufferInternalBrowser(base64: string): ArrayBuffer {
    try {
        const binary_string = globalThis.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    } catch (ex) {
        Logger("Base64 Decode error", LOG_LEVEL_VERBOSE);
        Logger(ex, LOG_LEVEL_VERBOSE);
        return new ArrayBuffer(0);
    }
}

// Base64 Encoding

const encodeChunkSize = 3 * 50000000;

/**
 * Converts an ArrayBuffer or Uint8Array to a base64-encoded string in a browser environment.
 * @param buffer The input buffer to be converted.
 * @returns A Promise that resolves to the base64-encoded string.
 */
function arrayBufferToBase64internalBrowser(buffer: DataView<ArrayBuffer> | Uint8Array<ArrayBuffer>): Promise<string> {
    return new Promise((res, rej) => {
        const blob = new Blob([buffer], { type: "application/octet-binary" });
        const reader = new FileReader();
        reader.onload = function (evt) {
            const dataURI = evt.target?.result?.toString() || "";
            if (buffer.byteLength != 0 && (dataURI == "" || dataURI == "data:"))
                return rej(new TypeError("Could not parse the encoded string"));
            const result = dataURI.substring(dataURI.indexOf(",") + 1);
            res(result);
        };
        reader.readAsDataURL(blob);
    });
}

/**
 * Converts an ArrayBuffer or Uint8Array to a base64 string in a browser environment.
 *
 * @param buffer - The ArrayBuffer to convert.
 * @returns A Promise that resolves to the base64 string representation of the ArrayBuffer.
 */
export async function arrayBufferToBase64SingleBrowser(buffer: ArrayBuffer | Uint8Array<ArrayBuffer>): Promise<string> {
    const buf = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (buf.byteLength < QUANTUM) return btoa(String.fromCharCode.apply(null, [...buf]));
    return await arrayBufferToBase64internalBrowser(buf);
}

/**
 * Converts an ArrayBuffer or Uint8Array to a base64 string using native methods.
 *
 * @param buffer - The ArrayBuffer to convert.
 * @returns A Promise that resolves to the base64 string representation of the ArrayBuffer.
 */
export function arrayBufferToBase64SingleNative(buffer: ArrayBuffer | Uint8Array<ArrayBuffer>): Promise<string> {
    const buf = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return Promise.resolve((buf as unknown as ExtendedUint8Array).toBase64());
}

/**
 * Converts an ArrayBuffer or Uint8Array to a base64 string.
 *
 * @param buffer - The ArrayBuffer to convert.
 * @returns A Promise that resolves to the base64 string representation of the ArrayBuffer.
 */
export const arrayBufferToBase64Single = isProposalArrayBufferBase64Available
    ? arrayBufferToBase64SingleNative
    : arrayBufferToBase64SingleBrowser;

/**
 * Converts an ArrayBuffer or Uint8Array to a base64 string using native methods.
 *
 * @param buffer - The ArrayBuffer to convert.
 * @returns A Promise that resolves to an array of base64 strings.
 */
export function arrayBufferToBase64Native(buffer: ArrayBuffer | Uint8Array<ArrayBuffer>): Promise<string[]> {
    const buf = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const result = (buf as unknown as ExtendedUint8Array).toBase64();
    return Promise.resolve([result]);
}

/**
 * Converts an ArrayBuffer or Uint8Array to a base64 string using browser-compatible methods.
 *
 * @param buffer - The ArrayBuffer to convert.
 * @returns A Promise that resolves to an array of base64 strings.
 */
export async function arrayBufferToBase64Browser(buffer: ArrayBuffer | Uint8Array<ArrayBuffer>): Promise<string[]> {
    const buf = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (buf.byteLength < QUANTUM) return [btoa(String.fromCharCode.apply(null, [...buf]))];
    const bufLen = buf.byteLength;
    const pieces = [] as string[];
    let idx = 0;
    do {
        const offset = idx * encodeChunkSize;
        const pBuf = new DataView(buf.buffer, offset, Math.min(encodeChunkSize, buf.byteLength - offset));
        pieces.push(await arrayBufferToBase64internalBrowser(pBuf));
        idx++;
    } while (idx * encodeChunkSize < bufLen);
    return pieces;
}

/**
 * Converts an ArrayBuffer or Uint8Array to a base64 string.
 *
 * @param buffer - The ArrayBuffer to convert.
 * @returns A Promise that resolves to an array of base64 strings.
 */
export const arrayBufferToBase64 = isProposalArrayBufferBase64Available
    ? arrayBufferToBase64Native
    : arrayBufferToBase64Browser;
//
// Safari's JavaScriptCore hardcoded the argument limit to 65536
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply
const QUANTUM = 32768;

/**
 *  Super fast Text Encoder / Decoder alternative.
 * @param {string} string - The string to convert.
 * @returns {Uint8Array} The Uint8Array buffer representing the string.
 * @see https://gist.github.com/kawanet/a66a0e2657464c57bcff2249286d3a24
 * @see https://qiita.com/kawanet/items/52062b0c86597f7dee7d
 *
 * remark: This is a super fast TextEncoder alternative.
 * todo: When Capacitor or Electron is upgraded, check and reappraise this.
 */

const te = new TextEncoder();
const td = new TextDecoder();

export function writeString(string: string): Uint8Array<ArrayBuffer> {
    if (string.length > 128) {
        const buf = te.encode(string);
        // if (isArrayBufferBased(buf)) {
        //     return buf;
        // }
        // return buf.slice();
        return buf;
    }
    // Prepare enough buffer.
    const buffer = new Uint8Array(string.length * 4);
    const length = string.length;
    let index = 0;
    let chr = 0;
    let idx = 0;
    while (idx < length) {
        chr = string.charCodeAt(idx++);
        if (chr < 128) {
            buffer[index++] = chr;
        } else if (chr < 0x800) {
            // 2 bytes
            buffer[index++] = 0xc0 | (chr >>> 6);
            buffer[index++] = 0x80 | (chr & 0x3f);
        } else if (chr < 0xd800 || chr > 0xdfff) {
            // 3 bytes
            buffer[index++] = 0xe0 | (chr >>> 12);
            buffer[index++] = 0x80 | ((chr >>> 6) & 0x3f);
            buffer[index++] = 0x80 | (chr & 0x3f);
        } else {
            // 4 bytes - surrogate pair
            chr = (((chr - 0xd800) << 10) | (string.charCodeAt(idx++) - 0xdc00)) + 0x10000;
            buffer[index++] = 0xf0 | (chr >>> 18);
            buffer[index++] = 0x80 | ((chr >>> 12) & 0x3f);
            buffer[index++] = 0x80 | ((chr >>> 6) & 0x3f);
            buffer[index++] = 0x80 | (chr & 0x3f);
        }
    }
    return buffer.slice(0, index);
}

/**
 * Converts a Uint8Array buffer to a string.
 *
 * @param buffer - The Uint8Array buffer to convert.
 * @returns The converted string.
 */
export function readString(buffer: Uint8Array): string {
    const length = buffer.length;
    if (length > 128) return td.decode(buffer);
    let index = 0;
    const end = length;
    let string = "";
    while (index < end) {
        const chunk = [];
        const cEnd = Math.min(index + QUANTUM, end);
        while (index < cEnd) {
            const chr = buffer[index++];
            if (chr < 128) {
                // 1 byte
                chunk.push(chr);
            } else if ((chr & 0xe0) === 0xc0) {
                // 2 bytes
                chunk.push(((chr & 0x1f) << 6) | (buffer[index++] & 0x3f));
            } else if ((chr & 0xf0) === 0xe0) {
                // 3 bytes
                chunk.push(((chr & 0x0f) << 12) | ((buffer[index++] & 0x3f) << 6) | (buffer[index++] & 0x3f));
            } else if ((chr & 0xf8) === 0xf0) {
                // 4 bytes
                let code =
                    ((chr & 0x07) << 18) |
                    ((buffer[index++] & 0x3f) << 12) |
                    ((buffer[index++] & 0x3f) << 6) |
                    (buffer[index++] & 0x3f);
                if (code < 0x010000) {
                    chunk.push(code);
                } else {
                    // surrogate pair
                    code -= 0x010000;
                    chunk.push((code >>> 10) + 0xd800, (code & 0x3ff) + 0xdc00);
                }
            }
        }
        string += String.fromCharCode(...chunk);
    }
    return string;
}

/**
 * Converts a base64 string or an array of base64 strings to a regular string.
 * @param base64 - The base64 string or an array of base64 strings to convert.
 * @returns The converted regular string.
 * @remarks This function is used to convert base64 strings to binary strings. And if failed, it returns the original string.
 */
export const base64ToString = isProposalArrayBufferBase64Available ? base64ToStringNative : base64ToStringBrowser;

/**
 * Converts a base64 string or an array of base64 strings to a regular string in a browser environment.
 * @param base64 - The base64 string or an array of base64 strings to convert.
 * @returns The converted regular string.
 * @remarks This function is used to convert base64 strings to binary strings. And if failed, it returns the original string.
 */
export function base64ToStringBrowser(base64: string | string[]): string {
    try {
        if (typeof base64 != "string") return base64.map((e) => base64ToStringBrowser(e)).join("");
        const binary_string = atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return readString(bytes);
    } catch (ex) {
        Logger("Base64 To String error", LOG_LEVEL_VERBOSE);
        Logger(ex, LOG_LEVEL_VERBOSE);
        if (typeof base64 != "string") return base64.join("");
        return base64;
    }
}

/**
 * Converts a base64 string or an array of base64 strings to a regular string using native methods.
 * @param base64 - The base64 string or an array of base64 strings to convert.
 * @returns The converted regular string.
 * @remarks This function is used to convert base64 strings to binary strings. And if failed, it returns the original string.
 */
export function base64ToStringNative(base64: string | string[]): string {
    try {
        if (typeof base64 != "string") return base64.map((e) => base64ToStringNative(e)).join("");

        const buffer = base64ToArrayBufferNative(base64);
        const bytes = new Uint8Array(buffer);
        if (bytes.length === 0 && base64.length > 0) {
            throw new TypeError("Could not parse the encoded string");
        }
        return readString(bytes);
    } catch (ex) {
        Logger("Base64 To String error", LOG_LEVEL_VERBOSE);
        Logger(ex, LOG_LEVEL_VERBOSE);
        if (typeof base64 != "string") return base64.join("");
        return base64;
    }
}

const regexpBase64 = /^[A-Za-z0-9+/]+=*$/;

/**
 * Tries to convert a base64 string to an ArrayBuffer.
 *
 * @param base64 - The base64 string to convert.
 * @returns The converted ArrayBuffer if successful, otherwise false.
 */
export const tryConvertBase64ToArrayBuffer = isProposalArrayBufferBase64Available
    ? tryConvertBase64ToArrayBufferNative
    : tryConvertBase64ToArrayBufferBrowser;

/**
 * Tries to convert a base64 string to an ArrayBuffer in a browser environment.
 *
 * @param base64 - The base64 string to convert.
 * @returns The converted ArrayBuffer if successful, otherwise false.
 */
export function tryConvertBase64ToArrayBufferBrowser(base64: string): ArrayBuffer | false {
    try {
        const b64F = base64.replace(/\r|\n/g, "");
        if (!regexpBase64.test(b64F)) {
            return false;
        }

        const binary_string = globalThis.atob(b64F);
        if (globalThis.btoa(binary_string) !== b64F) {
            return false;
        }
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    } catch {
        return false;
    }
}

/**
 * Tries to convert a base64 string to an ArrayBuffer using native methods.
 *
 * @param base64 - The base64 string to convert.
 * @returns The converted ArrayBuffer if successful, otherwise false.
 */
export function tryConvertBase64ToArrayBufferNative(base64: string): ArrayBuffer | false {
    try {
        const b64F = base64.replace(/\r|\n/g, "");
        if (!regexpBase64.test(b64F)) {
            return false;
        }
        const buf = (Uint8Array as unknown as ExtendedUint8Array).fromBase64(b64F);
        if ((buf as unknown as ExtendedUint8Array).toBase64() !== b64F) {
            return false;
        }
        return buf.byteLength > 0 ? buf.buffer : false;
    } catch {
        return false;
    }
}
