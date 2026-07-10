/**
 * Encrypts configuration data using a hybrid method of RSA-OAEP and AES-GCM.
 * @param configData The configuration data to be encrypted (JSON object).
 * @param publicKey The public key to use for encryption.
 * @returns The encrypted data, encoded as a Base64 string.
 */
export declare function encryptConfig(configData: object, publicKey: CryptoKey): Promise<string>;
/**
 * Decrypts configuration data that was encrypted using the hybrid method of RSA-OAEP and AES-GCM.
 * @param encryptedInfo The encrypted data (Uint8Array).
 * @param privateKey The private key to use for decryption.
 * @returns The decrypted configuration data (JSON object).
 * @throws Error if decryption fails or if JSON parsing fails.
 */
export declare function decryptConfig(encryptedInfo: Uint8Array, privateKey: CryptoKey): Promise<object>;
