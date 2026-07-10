const revMap: { [key: string]: number } = {};
const numMap: { [key: number]: string } = {};
for (let i = 0; i < 256; i++) {
    revMap[`00${i.toString(16)}`.slice(-2)] = i;
    numMap[i] = `00${i.toString(16)}`.slice(-2);
}

//@ts-ignore: Not typed in project target level
const isProposalArrayBufferBase64Available =
    typeof Uint8Array !== "undefined" &&
    //@ts-ignore: Not typed in project target level
    typeof Uint8Array.prototype.toBase64 === "function" &&
    //@ts-ignore: Not typed in project target level
    typeof Uint8Array.fromBase64 === "function";

interface ExtendedUint8Array {
    toHex: () => string;
    fromHex: (hex: string) => Uint8Array<ArrayBuffer>;
}

/**
 * Converts a hexadecimal string to a Uint8Array.
 * Each pair of characters in the input string represents a byte in the output Uint8Array.
 *
 * @param src - The hexadecimal string to convert.
 * @returns The Uint8Array representation of the input string.
 */
export const hexStringToUint8Array = isProposalArrayBufferBase64Available
    ? hexStringToUint8ArrayNative
    : hexStringToUint8ArrayBrowser;

/**
 * Converts a hexadecimal string to a Uint8Array using native methods.
 * Each pair of characters in the input string represents a byte in the output Uint8Array.
 *
 * @param src - The hexadecimal string to convert.
 * @returns The Uint8Array representation of the input string.
 */
export function hexStringToUint8ArrayNative(src: string): Uint8Array<ArrayBuffer> {
    return (Uint8Array as unknown as ExtendedUint8Array).fromHex(src);
}

/**
 * Converts a hexadecimal string to a Uint8Array using browser-compatible methods.
 * Each pair of characters in the input string represents a byte in the output Uint8Array.
 *
 * @param src - The hexadecimal string to convert.
 * @returns The Uint8Array representation of the input string.
 */
export function hexStringToUint8ArrayBrowser(src: string): Uint8Array<ArrayBuffer> {
    const len = src.length / 2;
    const ret = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        ret[i] = revMap[src[i * 2] + src[i * 2 + 1]];
    }
    return ret;
}

/**
 * Converts a Uint8Array to a hexadecimal string representation.
 *
 * @param src - The Uint8Array to convert.
 * @returns The hexadecimal string representation of the Uint8Array.
 */
export const uint8ArrayToHexString = isProposalArrayBufferBase64Available
    ? uint8ArrayToHexStringNative
    : uint8ArrayToHexStringBrowser;

/**
 * Converts a Uint8Array to a hexadecimal string representation using browser-compatible methods.
 *
 * @param src - The Uint8Array to convert.
 * @returns The hexadecimal string representation of the Uint8Array.
 */
export function uint8ArrayToHexStringBrowser(src: Uint8Array): string {
    return [...src].map((e) => numMap[e]).join("");
}

/**
 * Converts a Uint8Array to a hexadecimal string representation using native methods.
 *
 * @param src - The Uint8Array to convert.
 * @returns The hexadecimal string representation of the Uint8Array.
 */
export function uint8ArrayToHexStringNative(src: Uint8Array): string {
    return (src as unknown as ExtendedUint8Array).toHex();
}
