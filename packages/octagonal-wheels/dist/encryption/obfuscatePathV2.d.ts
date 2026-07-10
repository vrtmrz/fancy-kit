/**
 * Determines whether the path is likely to be obfuscated using the V2 method.
 * @param path The path string to be checked
 * @returns True if the path is obfuscated, otherwise false
 */
export declare function isPathProbablyObfuscatedV2(path: string): boolean;
/**
 * Obfuscates a path using the V2 method.
 * If the path is already obfuscated, it is returned as is.
 *
 * 1. A key is derived from the passphrase and salt using HKDF.
 * 2. The path is hashed using HMAC.
 * 3. The result is encoded using base64url.
 * 4. The prefix is added and the result is returned.
 *
 * @param path The path to be obfuscated
 * @param passphrase The passphrase
 * @param hkdfSalt The salt for HKDF
 * @returns The obfuscated path (returned as a Promise)
 */
export declare function obfuscatePathV2<T extends string>(path: T, passphrase: string, hkdfSalt: Uint8Array<ArrayBuffer>): Promise<string>;
