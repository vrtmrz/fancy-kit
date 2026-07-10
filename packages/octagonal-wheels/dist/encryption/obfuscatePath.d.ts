/**
 * Obfuscates the given path using AES-GCM encryption. This obfuscation is deterministic.
 * @param path - The path to obfuscate.
 * @param passphrase - The passphrase used for encryption.
 * @param autoCalculateIterations - A boolean indicating whether to automatically calculate the iterations.
 * @returns The obfuscated path: |%| iv(32) | salt(32) | data ....
 */
export declare function obfuscatePath<T extends string>(path: T, passphrase: string, autoCalculateIterations: boolean): Promise<string>; /**
 * Checks if a given path is probably obfuscated.
 *
 * @param path - The path to check.
 * @returns `true` if the path is probably obfuscated, `false` otherwise.
 */
export declare function isPathProbablyObfuscated(path: string): boolean;
/**
 * Generates a key, salt, and IV for obfuscating a path using the provided passphrase.
 * @param passphrase - The passphrase used for key generation.
 * @param dataBuf - The data buffer to be used in key derivation.
 * @param autoCalculateIterations - A flag indicating whether to automatically calculate the number of iterations based on the passphrase length.
 * @returns A promise that resolves to an array containing the generated key, salt, and IV.
 */
export declare function getKeyForObfuscatePath(passphrase: string, dataBuf: Uint8Array, autoCalculateIterations: boolean): Promise<[CryptoKey, Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>]>;
