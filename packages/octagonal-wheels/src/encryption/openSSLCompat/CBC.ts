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

const KEY_LENGTH = 32; // 32 bytes for AES-256

const ALGORITHM_NAME = "AES-CBC";

export const SALT_PREFIX = new Uint8Array([0x53, 0x61, 0x6c, 0x74, 0x65, 0x64, 0x5f, 0x5f]); // "Salted__"
export const SALT_LENGTH = 8; // 8 bytes for salt

export async function passphraseToKeyMaterial(passphrase: string): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(passphrase),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );
    return keyMaterial;
}

export async function generateIV(
    keyMaterial: CryptoKey,
    salt: Uint8Array<ArrayBuffer>,
    iterations: number = 100_000
): Promise<ArrayBuffer> {
    // 32 bytes for key + 16 bytes for IV = 384 bits for CBC
    const length = 48; // 384 bits for CBC
    const keyIv = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt,
            iterations,
            hash: "SHA-256",
        },
        keyMaterial,
        length * 8 // deriveBits length is in bits
    );
    return keyIv;
}

type KeyIvPair = {
    key: CryptoKey;
    iv: ArrayBuffer;
};
export async function generateOpenSSLCompatIvKey(
    passphrase: string,
    salt: Uint8Array<ArrayBuffer>,
    iterations: number = 100_000,
    usage: "encrypt" | "decrypt" = "decrypt"
): Promise<KeyIvPair> {
    const keyMaterial = await passphraseToKeyMaterial(passphrase);
    // Generate key and IV based on the algorithm
    const keyIv = await generateIV(keyMaterial, salt, iterations);
    const key = await crypto.subtle.importKey("raw", keyIv.slice(0, KEY_LENGTH), { name: ALGORITHM_NAME }, false, [
        usage,
    ]);
    const iv = keyIv.slice(KEY_LENGTH);
    return { key, iv };
}

/**
 * Encrypts plaintext using a password and a specified number of iterations.
 * @param plaintext The plaintext to encrypt.
 * @param passphrase The password to use for encryption.
 * @param iterations The number of iterations for key derivation.
 * @returns The encrypted ciphertext.
 */
export async function encryptCBC(
    plaintext: Uint8Array<ArrayBuffer>,
    passphrase: string,
    iterations: number = 100_000
): Promise<Uint8Array<ArrayBuffer>> {
    // Generate a random salt
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

    const { key, iv } = await generateOpenSSLCompatIvKey(passphrase, salt, iterations, "encrypt");

    // Encrypt
    const encrypted = await crypto.subtle.encrypt({ name: ALGORITHM_NAME, iv }, key, plaintext);

    // Compose result: "Salted__" + salt + ciphertext
    const result = new Uint8Array(SALT_PREFIX.length + SALT_LENGTH + encrypted.byteLength);
    result.set(SALT_PREFIX, 0);
    result.set(salt, SALT_PREFIX.length);
    result.set(new Uint8Array(encrypted), SALT_PREFIX.length + SALT_LENGTH);

    return result;
}

/**
 * Decrypts ciphertext using a password and a specified number of iterations.
 * @param encryptedData The encrypted data to decrypt.
 * @param passphrase The password to use for decryption.
 * @param iterations The number of iterations for key derivation.
 * @returns The decrypted plaintext.
 */
export async function decryptCBC(
    encryptedData: Uint8Array,
    passphrase: string,
    iterations: number = 100_000
): Promise<Uint8Array<ArrayBuffer>> {
    // Validate input length
    if (encryptedData.length < SALT_PREFIX.length + SALT_LENGTH) {
        throw new Error("Encrypted data is too short");
    }
    // Validate prefix
    if (!encryptedData.slice(0, SALT_PREFIX.length).every((v, i) => v === SALT_PREFIX[i])) {
        throw new Error("Invalid encrypted data format");
    }

    const salt = encryptedData.slice(SALT_PREFIX.length, SALT_PREFIX.length + SALT_LENGTH);
    const ciphertext = encryptedData.slice(SALT_PREFIX.length + SALT_LENGTH);

    const { key, iv } = await generateOpenSSLCompatIvKey(passphrase, salt, iterations, "decrypt");
    // Decrypt
    const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM_NAME, iv }, key, ciphertext);

    return new Uint8Array(decrypted);
}
