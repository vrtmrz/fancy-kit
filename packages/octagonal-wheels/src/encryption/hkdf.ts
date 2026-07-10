// HKDF with GCM-AES end-to-end encryption is employed for chunk encryption during synchronisation.
// The passphrase is intended solely for end-to-end encryption. The database server password should differ from the passphrase.
// ** For security reasons, the passphrase must never be identical to the server credentials password. **
// To address both performance and security concerns, HKDF is utilised to derive a master key from the passphrase and a salt.
// The master key is derived using the supplied salt with PBKDF2, after which HKDF is used to derive a chunk key from the master key.
// The salt for the master key (pbkdf2Salt) should be stored securely, as it is required for decryption.
// The chunk key is used to encrypt and decrypt data using AES-GCM.
// Once again, this is a security measure, and the same passphrase as the server credentials password should not be used.
import { arrayBufferToBase64Single, base64ToArrayBuffer, readString, writeString } from "../binary/base64.ts";
import { uint8ArrayToHexString } from "../binary/hex.ts";
import { concatUInt8Array, createTypedArrayReader } from "../collection.ts";
import { LOG_LEVEL_VERBOSE, Logger } from "../common/logger.ts";
import { memoWithMap } from "../memory/memo.ts";

/**
 * Global instance of the WebCrypto API.
 */
const webcrypto = globalThis.crypto;

/**
 * Byte length of the IV (initialisation vector) used for AES-GCM.
 */
const IV_LENGTH = 12; // AES-GCM typically uses a 12-byte IV (96 bits)
/**
 * Number of PBKDF2 iterations (as recommended by OWASP).
 */
const PBKDF2_ITERATIONS = 310_000;
/**
 * Byte length of the session salt used for HKDF.
 */
const HKDF_SALT_LENGTH = 32;
/**
 * Byte length of the salt used for PBKDF2.
 */
const PBKDF2_SALT_LENGTH = 32;
/**
 * Tag length for AES-GCM (in bits).
 */
const gcmTagLength = 128; // GCM tag length in bits

export const HKDF_ENCRYPTED_PREFIX = "%=";
export const HKDF_SALTED_ENCRYPTED_PREFIX = "%$";

/**
 * Generates a random salt for PBKDF2.
 * @returns A Uint8Array of PBKDF2_SALT_LENGTH bytes.
 */
export function createPBKDF2Salt() {
    // Generate a random salt of PBKDF2_SALT_LENGTH bytes
    return webcrypto.getRandomValues(new Uint8Array(PBKDF2_SALT_LENGTH));
}

/**
 * Derives a master key (CryptoKey for HKDF) from a passphrase and PBKDF2 salt.
 * Memoised; the cache is used for identical inputs.
 * @param passphrase The passphrase.
 * @param pbkdf2Salt The salt for PBKDF2.
 * @returns A CryptoKey for HKDF.
 */
const deriveMasterKey = memoWithMap(
    10,
    async (passphrase: string, pbkdf2Salt: Uint8Array<ArrayBuffer>) => {
        const binaryPassphrase = writeString(passphrase);
        const keyMaterial = await webcrypto.subtle.importKey(
            "raw",
            binaryPassphrase,
            {
                name: "PBKDF2",
                length: 256, // Length of the key in bits
            },
            false,
            ["deriveKey"]
        );
        // 2. Derive the master key using PBKDF2. First, obtain the "raw" key.
        const masterKeyRaw = await webcrypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: pbkdf2Salt,
                iterations: PBKDF2_ITERATIONS,
                hash: "SHA-256",
            },
            keyMaterial,
            // Output the "raw" key
            { name: "AES-GCM", length: 256 },
            true, // extractable
            ["encrypt", "decrypt"] // The master key is used for encryption/decryption
        );
        // Obtain the "raw" key as an ArrayBuffer for HKDF
        const masterKeyBuffer = await webcrypto.subtle.exportKey("raw", masterKeyRaw);
        // Import as a CryptoKey for HKDF
        const hkdfKey = await webcrypto.subtle.importKey("raw", masterKeyBuffer, { name: "HKDF" }, false, [
            "deriveKey",
        ]);
        return hkdfKey;
    },
    ([passphrase, salt]) => {
        return `${passphrase}-${uint8ArrayToHexString(salt)}`;
    }
);

/**
 * Derives an AES-GCM key for chunk encryption from a passphrase, PBKDF2 salt, and HKDF salt.
 * @param passphrase The passphrase.
 * @param pbkdf2Salt The salt for PBKDF2.
 * @param hkdfSalt The salt for HKDF.
 * @returns A CryptoKey for AES-GCM.
 */
async function deriveKey(passphrase: string, pbkdf2Salt: Uint8Array<ArrayBuffer>, hkdfSalt: Uint8Array<ArrayBuffer>) {
    const masterKey = await deriveMasterKey(passphrase, pbkdf2Salt);
    const chunkKey = await webcrypto.subtle.deriveKey(
        {
            name: "HKDF",
            salt: hkdfSalt,
            info: new Uint8Array(), // Context info (if needed)
            hash: "SHA-256",
        },
        masterKey,
        // Specify the algorithm and usage for the chunk key
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"] // The chunk key is used only for encryption/decryption
    );
    return chunkKey;
}

/**
 * Performs AES-GCM encryption using the specified key, IV, and data.
 * @param key The CryptoKey for AES-GCM.
 * @param iv The initialisation vector.
 * @param data The data to be encrypted.
 * @returns The encrypted data as an ArrayBuffer.
 */
async function encryptData(key: CryptoKey, iv: Uint8Array<ArrayBuffer>, data: Uint8Array<ArrayBuffer>) {
    return await webcrypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv,
            tagLength: gcmTagLength,
        },
        key,
        data
    );
}

/**
 * Encrypts a string using AES-GCM, returning the IV, session salt, and encrypted data.
 * @param input The string to be encrypted.
 * @param passphrase The passphrase.
 * @param pbkdf2Salt The salt for PBKDF2.
 * @returns An array containing [IV, HKDF salt, encrypted data].
 */
async function _encrypt(input: Uint8Array<ArrayBuffer>, passphrase: string, pbkdf2Salt: Uint8Array<ArrayBuffer>) {
    const hkdfSalt = webcrypto.getRandomValues(new Uint8Array(HKDF_SALT_LENGTH));
    const key = await deriveKey(passphrase, pbkdf2Salt, hkdfSalt);
    const iv = webcrypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encryptedDataArrayBuffer = await encryptData(key, iv, input);
    const encryptedData = new Uint8Array(encryptedDataArrayBuffer);
    // Return data with iv and salt.
    // | iv(12) | salt(32) | data ....
    return [iv, hkdfSalt, encryptedData];
}

/**
 * Encrypts a string using AES-GCM and returns the result as binary data (Uint8Array).
 * @param input The string to be encrypted.
 * @param passphrase The passphrase.
 * @param pbkdf2Salt The salt for PBKDF2.
 * @returns The encrypted binary data.
 */
export async function encryptBinary(
    input: Uint8Array<ArrayBuffer>,
    passphrase: string,
    pbkdf2Salt: Uint8Array<ArrayBuffer>
) {
    const [iv, hkdfSalt, encryptedData] = await _encrypt(input, passphrase, pbkdf2Salt);
    const totalLength = iv.length + hkdfSalt.length + encryptedData.length;
    const result = new Uint8Array(totalLength);

    result.set(iv, 0);
    result.set(hkdfSalt, iv.length);
    result.set(encryptedData, iv.length + hkdfSalt.length);
    return result;
}

/**
 * Encrypts a string using AES-GCM and returns a Base64-encoded string (beginning with '%=').
 * @param input The string to be encrypted.
 * @param passphrase The passphrase.
 * @param pbkdf2Salt The salt for PBKDF2.
 * @returns The encrypted string (Base64, beginning with '%=').
 */
export async function encrypt(input: string, passphrase: string, pbkdf2Salt: Uint8Array<ArrayBuffer>) {
    const inputBuffer = writeString(input);
    const encrypted = await encryptBinary(inputBuffer, passphrase, pbkdf2Salt);
    const inBase64 = await arrayBufferToBase64Single(encrypted);
    return `${HKDF_ENCRYPTED_PREFIX}${inBase64}`;
}

/**
 * Decrypts using the IV, PBKDF2 salt, HKDF salt, encrypted data, and passphrase, returning a Uint8Array.
 * @param iv The initialisation vector.
 * @param pbkdf2Salt The salt for PBKDF2.
 * @param hkdfSalt The salt for HKDF.
 * @param encryptedData The encrypted data.
 * @param passphrase The passphrase.
 * @returns The decrypted data as a Uint8Array.
 */
async function _decrypt(
    iv: Uint8Array<ArrayBuffer>,
    pbkdf2Salt: Uint8Array<ArrayBuffer>,
    hkdfSalt: Uint8Array<ArrayBuffer>,
    encryptedData: Uint8Array<ArrayBuffer>,
    passphrase: string
) {
    const key = await deriveKey(passphrase, pbkdf2Salt, hkdfSalt);
    const decryptedDataArrayBuffer = await webcrypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv,
            tagLength: gcmTagLength,
        },
        key,
        encryptedData
    );
    return new Uint8Array(decryptedDataArrayBuffer);
}

/**
 * Decrypts binary encrypted data (Uint8Array) and returns the original string.
 * @param binary The encrypted binary data.
 * @param passphrase The passphrase.
 * @param pbkdf2Salt The salt for PBKDF2.
 * @returns The decrypted string.
 * @throws An exception is thrown if the input data is invalid or decryption fails.
 */
export async function decryptBinary(
    binary: Uint8Array<ArrayBuffer>,
    passphrase: string,
    pbkdf2Salt: Uint8Array<ArrayBuffer>
) {
    if (binary.length < IV_LENGTH + HKDF_SALT_LENGTH) {
        throw new Error("Invalid binary data length. Expected at least ivLength + saltLength bytes.");
    }
    const iv = binary.slice(0, IV_LENGTH);
    const hkdfSalt = binary.slice(IV_LENGTH, IV_LENGTH + HKDF_SALT_LENGTH);
    const encryptedData = binary.slice(IV_LENGTH + HKDF_SALT_LENGTH);
    const decryptedData = await _decrypt(iv, pbkdf2Salt, hkdfSalt, encryptedData, passphrase);
    return decryptedData;
}

/**
 * Decrypts a Base64-encoded encrypted string (beginning with '%=') and returns the original string.
 * @param input The encrypted string (Base64, beginning with '%=').
 * @param passphrase The passphrase.
 * @param pbkdf2Salt The salt for PBKDF2.
 * @returns The decrypted string.
 * @throws An exception is thrown if the input format is invalid or decryption fails.
 */
export async function decrypt(input: string, passphrase: string, pbkdf2Salt: Uint8Array<ArrayBuffer>) {
    if (!input.startsWith(HKDF_ENCRYPTED_PREFIX)) {
        throw new Error(`Invalid input format. Expected input to start with '${HKDF_ENCRYPTED_PREFIX}'.`);
    }
    const headerLength = HKDF_ENCRYPTED_PREFIX.length;
    const encryptedData = base64ToArrayBuffer(input.slice(headerLength));
    const decrypted = await decryptBinary(new Uint8Array(encryptedData), passphrase, pbkdf2Salt);
    return readString(decrypted);
}

export async function testEncryptionFeature() {
    const testValue = `Supercalifragilisticexpialidocious1234567890!@#$%^&*()_+[]{}|;':",.<>?✔️✔️⚡𠮷𠮷`;
    const testPassphrase = "test-passphrase";
    const pbkdf2Salt = createPBKDF2Salt();
    try {
        const encrypted = await encrypt(testValue, testPassphrase, pbkdf2Salt);
        const decrypted = await decrypt(encrypted, testPassphrase, pbkdf2Salt);
        /* istanbul ignore if -- @preserve */
        if (decrypted !== testValue) {
            /* istanbul ignore if -- @preserve */
            throw new Error("Decryption did not return the original value.");
        }
        Logger("Encryption feature test passed.", LOG_LEVEL_VERBOSE);
        return true;
    } catch (error) {
        /* istanbul ignore next -- @preserve */
        Logger("WARNING! Your device would not support encryption.", LOG_LEVEL_VERBOSE);
        /* istanbul ignore next -- @preserve */
        Logger(error, LOG_LEVEL_VERBOSE);
        /* istanbul ignore next -- @preserve */
        return false;
    }
}
// With ephemeral salt, a new salt is generated for each encryption operation.

/**
 * Global variable to store the session salt. This is used to ensure that the same salt is used for the entire session.
 */
let _sessionPBKDFSalt: Uint8Array<ArrayBuffer> | undefined;

function getSessionPBKDFSalt(refresh = false): Uint8Array<ArrayBuffer> {
    if (_sessionPBKDFSalt === undefined || refresh) {
        _sessionPBKDFSalt = createPBKDF2Salt();
    }
    return _sessionPBKDFSalt;
}

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
export async function encryptWithEphemeralSaltBinary(
    input: Uint8Array<ArrayBuffer>,
    passphrase: string,
    refresh = false
): Promise<Uint8Array<ArrayBuffer>> {
    const pbkdf2Salt = getSessionPBKDFSalt(refresh);
    const result = await _encrypt(input, passphrase, pbkdf2Salt);
    const resultX = [pbkdf2Salt, ...result];
    const resultBuf = concatUInt8Array(resultX);
    return resultBuf;
}

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
export async function encryptWithEphemeralSalt(input: string, passphrase: string, refresh = false): Promise<string> {
    const encrypted = await encryptWithEphemeralSaltBinary(writeString(input), passphrase, refresh);
    const inBase64 = await arrayBufferToBase64Single(encrypted);
    return `${HKDF_SALTED_ENCRYPTED_PREFIX}${inBase64}`;
}

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
export async function decryptWithEphemeralSaltBinary(
    input: Uint8Array<ArrayBuffer>,
    passphrase: string
): Promise<Uint8Array<ArrayBuffer>> {
    if (input.length < IV_LENGTH + HKDF_SALT_LENGTH + PBKDF2_SALT_LENGTH) {
        throw new Error("Invalid binary data length.");
    }
    const r = createTypedArrayReader(input);
    const pbkdf2Salt = r.read(PBKDF2_SALT_LENGTH);
    const iv = r.read(IV_LENGTH);
    const hkdfSalt = r.read(HKDF_SALT_LENGTH);
    const encryptedData = r.readAll();
    const decryptedData = await _decrypt(iv, pbkdf2Salt, hkdfSalt, encryptedData, passphrase);
    return decryptedData;
}

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
export async function decryptWithEphemeralSalt(input: string, passphrase: string): Promise<string> {
    if (!input.startsWith(HKDF_SALTED_ENCRYPTED_PREFIX)) {
        throw new Error(`Invalid input format. Expected input to start with '${HKDF_SALTED_ENCRYPTED_PREFIX}'.`);
    }
    const headerLength = HKDF_SALTED_ENCRYPTED_PREFIX.length;
    const encryptedData = base64ToArrayBuffer(input.slice(headerLength));
    const decrypted = await decryptWithEphemeralSaltBinary(new Uint8Array(encryptedData), passphrase);
    return readString(decrypted);
}
