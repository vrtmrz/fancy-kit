/**
 * Converts a hexadecimal string to a Uint8Array.
 * Each pair of characters in the input string represents a byte in the output Uint8Array.
 *
 * @param src - The hexadecimal string to convert.
 * @returns The Uint8Array representation of the input string.
 */
export declare const hexStringToUint8Array: typeof hexStringToUint8ArrayNative;
/**
 * Converts a hexadecimal string to a Uint8Array using native methods.
 * Each pair of characters in the input string represents a byte in the output Uint8Array.
 *
 * @param src - The hexadecimal string to convert.
 * @returns The Uint8Array representation of the input string.
 */
export declare function hexStringToUint8ArrayNative(src: string): Uint8Array<ArrayBuffer>;
/**
 * Converts a hexadecimal string to a Uint8Array using browser-compatible methods.
 * Each pair of characters in the input string represents a byte in the output Uint8Array.
 *
 * @param src - The hexadecimal string to convert.
 * @returns The Uint8Array representation of the input string.
 */
export declare function hexStringToUint8ArrayBrowser(src: string): Uint8Array<ArrayBuffer>;
/**
 * Converts a Uint8Array to a hexadecimal string representation.
 *
 * @param src - The Uint8Array to convert.
 * @returns The hexadecimal string representation of the Uint8Array.
 */
export declare const uint8ArrayToHexString: typeof uint8ArrayToHexStringNative;
/**
 * Converts a Uint8Array to a hexadecimal string representation using browser-compatible methods.
 *
 * @param src - The Uint8Array to convert.
 * @returns The hexadecimal string representation of the Uint8Array.
 */
export declare function uint8ArrayToHexStringBrowser(src: Uint8Array): string;
/**
 * Converts a Uint8Array to a hexadecimal string representation using native methods.
 *
 * @param src - The Uint8Array to convert.
 * @returns The hexadecimal string representation of the Uint8Array.
 */
export declare function uint8ArrayToHexStringNative(src: Uint8Array): string;
