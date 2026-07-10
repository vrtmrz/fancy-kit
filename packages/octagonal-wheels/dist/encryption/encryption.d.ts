export declare const ENCRYPT_V1_PREFIX_PROBABLY = "[";
export declare const ENCRYPT_V2_PREFIX = "%";
export declare const ENCRYPT_V3_PREFIX = "%~";
export type encodedData = [encryptedData: string, iv: string, salt: string];
export type KeyBuffer = {
    key: CryptoKey;
    salt: Uint8Array<ArrayBuffer>;
    count: number;
};
/**
 * Encrypts the input string using AES-GCM encryption algorithm.
 * @param input - The string to be encrypted.
 * @param passphrase - The passphrase used for encryption.
 * @param autoCalculateIterations - A boolean indicating whether to automatically calculate the iterations for key derivation.
 * @returns A string representing the encrypted data, initialization vector (IV), and salt in JSON format.
 * @deprecated Use `hkdf` instead.
 */
export declare function encryptV1(input: string, passphrase: string, autoCalculateIterations: boolean): Promise<string>;
/**
 * Encrypts the input string using AES-GCM encryption algorithm.
 *
 * @param input - The string to be encrypted.
 * @param passphrase - The passphrase used for encryption.
 * @param autoCalculateIterations - A boolean indicating whether to automatically calculate the iterations for key derivation.
 * @returns The encrypted data with initialization vector (iv) and salt. <br>  |%| iv(32) | salt(32) | data ....
 * @deprecated Use `hkdf` instead.
 */
export declare function encrypt(input: string, passphrase: string, autoCalculateIterations: boolean): Promise<string>;
/**
 * Decrypts the encrypted result using the provided passphrase.
 * @param encryptedResult - The encrypted result to decrypt.
 * @param passphrase - The passphrase used for decryption.
 * @param autoCalculateIterations - A boolean indicating whether to automatically calculate the iterations.
 * @returns A Promise that resolves to the decrypted string.
 * @throws If the encrypted data is corrupted or if decryption fails.
 * @deprecated Use `hkdf` instead.
 */
export declare function decrypt(encryptedResult: string, passphrase: string, autoCalculateIterations: boolean): Promise<string>;
/**
 * Tries to decrypt the encrypted result using the provided passphrase.
 *
 * @param encryptedResult - The encrypted result to decrypt.
 * @param passphrase - The passphrase used for decryption.
 * @param autoCalculateIterations - A boolean indicating whether to automatically calculate the iterations.
 * @returns A promise that resolves to the decrypted result if successful, or `false` if decryption fails.
 * @deprecated Use `hkdf` instead.
 */
export declare function tryDecrypt(encryptedResult: string, passphrase: string | false, autoCalculateIterations: boolean): Promise<string | false>;
/**
 * @deprecated Use `hkdf` instead.
 */
export declare function testCryptV3(): Promise<boolean>;
/**
 * Tests the encryption and decryption functionality.
 * @deprecated Use `hkdf.testEncryptionFeature` instead.
 * @returns {Promise<boolean>} A promise that resolves to `true` if encryption and decryption are successful, and `false` otherwise.
 */
export declare function testCrypt(): Promise<boolean>;
/**
 * Encrypts binary data using AES-GCM encryption algorithm.
 *
 * @param input - The binary data to be encrypted.
 * @param passphrase - The passphrase used to derive the encryption key.
 * @param autoCalculateIterations - A boolean indicating whether to automatically calculate the number of iterations for key derivation.
 * @returns The encrypted binary data.
 */
export declare function encryptBinary(input: Uint8Array<ArrayBuffer>, passphrase: string, autoCalculateIterations: boolean): Promise<Uint8Array<ArrayBuffer>>;
/**
 * Decrypts the encrypted binary data using the provided passphrase.
 * @param encryptedResult - The encrypted binary data as a Uint8Array.
 * @param passphrase - The passphrase used for decryption.
 * @param autoCalculateIterations - A boolean indicating whether to automatically calculate the iterations for key derivation.
 * @returns A Promise that resolves to the decrypted binary data as a Uint8Array.
 * @throws If decryption fails or an error occurs during the decryption process.
 */
export declare function decryptBinary(encryptedResult: Uint8Array, passphrase: string, autoCalculateIterations: boolean): Promise<Uint8Array>;
export { obfuscatePath, isPathProbablyObfuscated } from "./obfuscatePath.ts";
