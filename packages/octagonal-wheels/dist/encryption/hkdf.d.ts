export declare const HKDF_ENCRYPTED_PREFIX = "%=";
export declare const HKDF_SALTED_ENCRYPTED_PREFIX = "%$";
/**
 * Generates a random salt for PBKDF2.
 * @returns A Uint8Array of PBKDF2_SALT_LENGTH bytes.
 */
export declare function createPBKDF2Salt(): Uint8Array<ArrayBuffer>;
/**
 * Encrypts a string using AES-GCM and returns the result as binary data (Uint8Array).
 * @param input The string to be encrypted.
 * @param passphrase The passphrase.
 * @param pbkdf2Salt The salt for PBKDF2.
 * @returns The encrypted binary data.
 */
export declare function encryptBinary(input: Uint8Array<ArrayBuffer>, passphrase: string, pbkdf2Salt: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>>;
/**
 * Encrypts a string using AES-GCM and returns a Base64-encoded string (beginning with '%=').
 * @param input The string to be encrypted.
 * @param passphrase The passphrase.
 * @param pbkdf2Salt The salt for PBKDF2.
 * @returns The encrypted string (Base64, beginning with '%=').
 */
export declare function encrypt(input: string, passphrase: string, pbkdf2Salt: Uint8Array<ArrayBuffer>): Promise<string>;
/**
 * Decrypts binary encrypted data (Uint8Array) and returns the original string.
 * @param binary The encrypted binary data.
 * @param passphrase The passphrase.
 * @param pbkdf2Salt The salt for PBKDF2.
 * @returns The decrypted string.
 * @throws An exception is thrown if the input data is invalid or decryption fails.
 */
export declare function decryptBinary(binary: Uint8Array<ArrayBuffer>, passphrase: string, pbkdf2Salt: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>>;
/**
 * Decrypts a Base64-encoded encrypted string (beginning with '%=') and returns the original string.
 * @param input The encrypted string (Base64, beginning with '%=').
 * @param passphrase The passphrase.
 * @param pbkdf2Salt The salt for PBKDF2.
 * @returns The decrypted string.
 * @throws An exception is thrown if the input format is invalid or decryption fails.
 */
export declare function decrypt(input: string, passphrase: string, pbkdf2Salt: Uint8Array<ArrayBuffer>): Promise<string>;
export declare function testEncryptionFeature(): Promise<boolean>;
/**
 * Encrypts the provided binary input using a passphrase and an ephemeral salt.
 *
 * This function generates a new PBKDF2 salt for each encryption operation,
 * encrypts the input data with the given passphrase and generated salt,
 * and concatenates the encrypted result with the salt into a single
 * Uint8Array buffer.
 * Note that this function keeps the same PBKDF2 salt for the session unless `refresh` is set to true.
 *
 * @param input - The binary data to encrypt.
 * @param passphrase - The passphrase used for encryption.
 * @returns A promise that resolves to a Uint8Array containing the encrypted data
 *          followed by the ephemeral salt.
 */
export declare function encryptWithEphemeralSaltBinary(input: Uint8Array<ArrayBuffer>, passphrase: string, refresh?: boolean): Promise<Uint8Array<ArrayBuffer>>;
/**
 * Encrypts a string using a passphrase and an ephemeral salt.
 * The function internally converts the input string to binary, encrypts it,
 * and returns the result as a base64-encoded string prefixed with a constant.
 * Note that this function keeps the same PBKDF2 salt for the session unless `refresh` is set to true.
 *
 * @param input - The plaintext string to encrypt.
 * @param passphrase - The passphrase used for encryption.
 * @param refresh - If true, generates a new PBKDF2 salt for the session.
 * @returns A promise that resolves to the encrypted string in base64 format with a prefix.
 */
export declare function encryptWithEphemeralSalt(input: string, passphrase: string, refresh?: boolean): Promise<string>;
/**
 * Decrypts binary data that was encrypted with an ephemeral salt using a passphrase.
 *
 * The input binary data is expected to contain, in order:
 * - Initialisation vector (IV)
 * - HKDF salt
 * - PBKDF2 salt
 * - Encrypted payload
 *
 * The function extracts these components, then uses them along with the provided passphrase
 * to decrypt the payload.
 *
 * @param input - The binary data to decrypt, containing IV, HKDF salt, PBKDF2 salt, and encrypted data.
 * @param passphrase - The passphrase used for decryption.
 * @returns A promise that resolves to the decrypted binary data.
 * @throws If the input data length is invalid.
 */
export declare function decryptWithEphemeralSaltBinary(input: Uint8Array<ArrayBuffer>, passphrase: string): Promise<Uint8Array<ArrayBuffer>>;
/**
 * Decrypts a base64-encoded string that was encrypted using an ephemeral salt and a passphrase.
 * The input string must start with the expected prefix to indicate the encryption format.
 * Internally, this function decodes the base64 input, decrypts the binary data using the provided passphrase,
 * and returns the resulting plaintext string.
 *
 * @param input - The base64-encoded encrypted string, prefixed with `HKDF_SALTED_ENCRYPTED_PREFIX`.
 * @param passphrase - The passphrase used for decryption.
 * @returns A promise that resolves to the decrypted plaintext string.
 * @throws If the input does not start with the expected prefix or decryption fails.
 */
export declare function decryptWithEphemeralSalt(input: string, passphrase: string): Promise<string>;
