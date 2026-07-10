/**
 * OpenSSL compatible encryption and decryption using AES-256-CBC.
 * Compatible with OpenSSL's `enc` command.
 * Uses PBKDF2 with SHA-256 for key derivation and includes a salt in the encrypted output.
 * The salt is prefixed with "Salted__" to match OpenSSL's output format.
 *
 * To decrypt the output, you can use the OpenSSL command:
 * `openssl enc -d -aes-256-cbc -in <encrypted file> -out <decrypted file> -k <passphrase> -pbkdf2 -md sha256 -iter <iterations>`
 *
 * [Note]
 * "AES-256-CBC" is used, which requires a 32-byte key and a 16-byte IV.
 * The IV is generated randomly for each encryption operation.
 * The salt is also generated randomly and prepended to the ciphertext.
 *
 * **No authentication tag is used**, as CBC mode does not provide integrity checks.
 * This implementation is designed to be compatible with OpenSSL's behavior. And not with the Web Crypto API's GCM mode.
 * (GCM is a different mode of operation, and it includes an authentication tag, which CBC does not.)
 * Hence, this code is not suitable for production use without additional security measures, such as integrity checks and secure key management.
 */
export declare const SALT_PREFIX: Uint8Array<ArrayBuffer>;
export declare const SALT_LENGTH = 8;
export declare function passphraseToKeyMaterial(passphrase: string): Promise<CryptoKey>;
export declare function generateIV(keyMaterial: CryptoKey, salt: Uint8Array<ArrayBuffer>, iterations?: number): Promise<ArrayBuffer>;
type KeyIvPair = {
    key: CryptoKey;
    iv: ArrayBuffer;
};
export declare function generateOpenSSLCompatIvKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations?: number, usage?: "encrypt" | "decrypt"): Promise<KeyIvPair>;
/**
 * Encrypts plaintext using a password and a specified number of iterations.
 * @param plaintext The plaintext to encrypt.
 * @param passphrase The password to use for encryption.
 * @param iterations The number of iterations for key derivation.
 * @returns The encrypted ciphertext.
 */
export declare function encryptCBC(plaintext: Uint8Array<ArrayBuffer>, passphrase: string, iterations?: number): Promise<Uint8Array<ArrayBuffer>>;
/**
 * Decrypts ciphertext using a password and a specified number of iterations.
 * @param encryptedData The encrypted data to decrypt.
 * @param passphrase The password to use for decryption.
 * @param iterations The number of iterations for key derivation.
 * @returns The decrypted plaintext.
 */
export declare function decryptCBC(encryptedData: Uint8Array, passphrase: string, iterations?: number): Promise<Uint8Array<ArrayBuffer>>;
export {};
