/**
 * Converts a base64 string or an array of base64 strings to an ArrayBuffer using native methods.
 * @param base64 - The base64 string or an array of base64 strings to convert.
 * @returns The converted ArrayBuffer.
 */
export declare function base64ToArrayBufferNative(base64: string | string[]): ArrayBuffer;
/**
 * Converts a base64 string or an array of base64 strings to an ArrayBuffer using browser-compatible methods.
 * @param base64 - The base64 string or an array of base64 strings to convert.
 * @returns The converted ArrayBuffer.
 */
export declare function base64ToArrayBufferBrowser(base64: string | string[]): ArrayBuffer;
/**
 * Converts a base64 string or an array of base64 strings to an ArrayBuffer.
 * @param base64 - The base64 string or an array of base64 strings to convert.
 * @returns The converted ArrayBuffer.
 */
export declare const base64ToArrayBuffer: typeof base64ToArrayBufferNative;
/**
 * Converts a base64 string to an ArrayBuffer in a browser environment.
 *
 * @param base64 - The base64 string to convert.
 * @returns The converted ArrayBuffer.
 */
export declare function base64ToArrayBufferInternalBrowser(base64: string): ArrayBuffer;
/**
 * Converts an ArrayBuffer or Uint8Array to a base64 string in a browser environment.
 *
 * @param buffer - The ArrayBuffer to convert.
 * @returns A Promise that resolves to the base64 string representation of the ArrayBuffer.
 */
export declare function arrayBufferToBase64SingleBrowser(buffer: ArrayBuffer | Uint8Array<ArrayBuffer>): Promise<string>;
/**
 * Converts an ArrayBuffer or Uint8Array to a base64 string using native methods.
 *
 * @param buffer - The ArrayBuffer to convert.
 * @returns A Promise that resolves to the base64 string representation of the ArrayBuffer.
 */
export declare function arrayBufferToBase64SingleNative(buffer: ArrayBuffer | Uint8Array<ArrayBuffer>): Promise<string>;
/**
 * Converts an ArrayBuffer or Uint8Array to a base64 string.
 *
 * @param buffer - The ArrayBuffer to convert.
 * @returns A Promise that resolves to the base64 string representation of the ArrayBuffer.
 */
export declare const arrayBufferToBase64Single: typeof arrayBufferToBase64SingleNative;
/**
 * Converts an ArrayBuffer or Uint8Array to a base64 string using native methods.
 *
 * @param buffer - The ArrayBuffer to convert.
 * @returns A Promise that resolves to an array of base64 strings.
 */
export declare function arrayBufferToBase64Native(buffer: ArrayBuffer | Uint8Array<ArrayBuffer>): Promise<string[]>;
/**
 * Converts an ArrayBuffer or Uint8Array to a base64 string using browser-compatible methods.
 *
 * @param buffer - The ArrayBuffer to convert.
 * @returns A Promise that resolves to an array of base64 strings.
 */
export declare function arrayBufferToBase64Browser(buffer: ArrayBuffer | Uint8Array<ArrayBuffer>): Promise<string[]>;
/**
 * Converts an ArrayBuffer or Uint8Array to a base64 string.
 *
 * @param buffer - The ArrayBuffer to convert.
 * @returns A Promise that resolves to an array of base64 strings.
 */
export declare const arrayBufferToBase64: typeof arrayBufferToBase64Native;
export declare function writeString(string: string): Uint8Array<ArrayBuffer>;
/**
 * Converts a Uint8Array buffer to a string.
 *
 * @param buffer - The Uint8Array buffer to convert.
 * @returns The converted string.
 */
export declare function readString(buffer: Uint8Array): string;
/**
 * Converts a base64 string or an array of base64 strings to a regular string.
 * @param base64 - The base64 string or an array of base64 strings to convert.
 * @returns The converted regular string.
 * @remarks This function is used to convert base64 strings to binary strings. And if failed, it returns the original string.
 */
export declare const base64ToString: typeof base64ToStringNative;
/**
 * Converts a base64 string or an array of base64 strings to a regular string in a browser environment.
 * @param base64 - The base64 string or an array of base64 strings to convert.
 * @returns The converted regular string.
 * @remarks This function is used to convert base64 strings to binary strings. And if failed, it returns the original string.
 */
export declare function base64ToStringBrowser(base64: string | string[]): string;
/**
 * Converts a base64 string or an array of base64 strings to a regular string using native methods.
 * @param base64 - The base64 string or an array of base64 strings to convert.
 * @returns The converted regular string.
 * @remarks This function is used to convert base64 strings to binary strings. And if failed, it returns the original string.
 */
export declare function base64ToStringNative(base64: string | string[]): string;
/**
 * Tries to convert a base64 string to an ArrayBuffer.
 *
 * @param base64 - The base64 string to convert.
 * @returns The converted ArrayBuffer if successful, otherwise false.
 */
export declare const tryConvertBase64ToArrayBuffer: typeof tryConvertBase64ToArrayBufferNative;
/**
 * Tries to convert a base64 string to an ArrayBuffer in a browser environment.
 *
 * @param base64 - The base64 string to convert.
 * @returns The converted ArrayBuffer if successful, otherwise false.
 */
export declare function tryConvertBase64ToArrayBufferBrowser(base64: string): ArrayBuffer | false;
/**
 * Tries to convert a base64 string to an ArrayBuffer using native methods.
 *
 * @param base64 - The base64 string to convert.
 * @returns The converted ArrayBuffer if successful, otherwise false.
 */
export declare function tryConvertBase64ToArrayBufferNative(base64: string): ArrayBuffer | false;
