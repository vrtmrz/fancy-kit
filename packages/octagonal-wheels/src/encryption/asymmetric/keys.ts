/**
 * Cryptographic key generation and management utilities.
 *
 * This module provides secure key generation for hybrid encryption:
 * - RSA-OAEP key pairs for asymmetric encryption (key wrapping)
 * - AES-GCM session keys for symmetric encryption (data encryption)
 * - ECDH key pairs for ephemeral key agreement and forward secrecy
 * - Key import/export functionality for storage and transmission
 * - Binary data serialization utilities (big-endian length encoding)
 * - Safe binary data reading with bounds checking
 *
 * Supported algorithms:
 * - RSA-OAEP with SHA-256 (2048-4096 bit keys supported, 3072+ recommended)
 * - AES-256-GCM for authenticated encryption
 * - ECDH with P-256, P-384, or P-521 curves
 *
 * Key export formats:
 * - RSA keys: JWK format encoded as Base64 strings
 * - ECDH public keys: Raw format as Uint8Array
 * - Session keys: CryptoKey objects with accompanying IV
 *
 * Security considerations:
 * - RSA key length of 3072+ bits is recommended for long-term security
 * - AES-256 offers strong symmetric encryption with 128-bit authentication tags
 * - IV (initialisation vector) is generated randomly for each session
 * - ECDH uses secure curves (P-256 default) for key agreement
 * - All random values are generated using cryptographically secure RNG
 */

import { arrayBufferToBase64Single, base64ToArrayBuffer, readString, writeString } from "../../binary/base64.ts";
import { AsymmetricKeyIOError, AsymmetricKeyGenerationError, AsymmetricEncryptionArgumentError } from "./common.ts";
import { webCrypto, type CryptographicKeyConfig, type ReadableArray, type SessionKey } from "./common.ts";
import {
    AES_GCM_IV_LENGTH,
    AES_KEY_LENGTH,
    DEFAULT_ECDH_CURVE,
    DEFAULT_RSA_MODULUS_LENGTH,
    DEFAULT_RSA_PUBLIC_EXPONENT,
    LENGTH_FIELD_SIZE,
    type ECDH_CURVES,
} from "./common.ts";

/**
 * Generates a key pair for RSA encryption.
 * @param options Options for key generation, such as modulusLength and publicExponent.
 * @returns The generated RSA key pair.
 * @throws Error if key generation fails.
 */
export async function generateEncryptionKeyPair(options?: CryptographicKeyConfig): Promise<CryptoKeyPair> {
    const modulusLength = options?.modulusLength || DEFAULT_RSA_MODULUS_LENGTH;
    const publicExponent = options?.publicExponent || DEFAULT_RSA_PUBLIC_EXPONENT;

    // Validate minimum security requirements
    if (modulusLength < 2048) {
        throw new AsymmetricEncryptionArgumentError("RSA modulus length must be at least 2048 bits for security");
    }

    try {
        const keyPair = await webCrypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: modulusLength,
                publicExponent: publicExponent,
                hash: "SHA-256", // SHA-256 provides good security and performance
            },
            true, // extractable: allows key export
            ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
        );
        return keyPair;
    } catch (error) {
        throw new AsymmetricKeyGenerationError(`Failed to generate RSA key pair`, error);
    }
}

/**
 * Generates a key pair for ECDH key agreement.
 * @param namedCurve The elliptic curve to use. "P-256" is a suitable default.
 * @returns The generated ECDH key pair.
 * @throws Error if key generation fails.
 */
export async function generateAgreementKeyPair(namedCurve: ECDH_CURVES = DEFAULT_ECDH_CURVE): Promise<CryptoKeyPair> {
    try {
        const keyPair = await webCrypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: namedCurve,
            },
            true, // extractable
            ["deriveKey"]
        );
        return keyPair;
    } catch (error) {
        throw new AsymmetricKeyGenerationError(`Failed to generate ECDH key pair`, error);
    }
}

/**
 * Generates a new AES session key for data encryption.
 * AES-256-GCM is used for authenticated encryption.
 * @returns The new AES session key and IV.
 * @throws Error if key generation fails.
 */
export async function generateAESSessionKey(): Promise<SessionKey> {
    try {
        const aesKey = await webCrypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: AES_KEY_LENGTH, // AES-256 for strong security
            },
            true, // extractable: allows key wrapping with RSA
            ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
        );

        // Generate cryptographically secure random IV
        const iv = webCrypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH));
        return { key: aesKey, iv };
    } catch (error) {
        throw new AsymmetricKeyGenerationError(`Failed to generate AES session key`, error);
    }
}

export async function generateSharedSecretKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
    if (publicKey.algorithm.name !== "ECDH") {
        throw new AsymmetricEncryptionArgumentError("Recipient public key must be an ECDH key");
    }

    // Derive the shared secret using the recipient's public key and the sender or ephemeral private key
    const sharedSecret = await webCrypto.subtle.deriveKey(
        {
            name: "ECDH",
            public: publicKey,
        },
        privateKey,
        {
            name: "AES-GCM",
            length: 256,
        },
        false,
        ["encrypt", "decrypt"]
    );

    return sharedSecret;
}

/**
 * Exports an ECDH public key as a Uint8Array.
 * @param publicKey The ECDH public key to export.
 * @returns The exported public key as a Uint8Array.
 * @throws Error if export fails.
 */
export async function exportECDHPublicKey(publicKey: CryptoKey): Promise<Uint8Array> {
    try {
        const exported = await webCrypto.subtle.exportKey("raw", publicKey);
        return new Uint8Array(exported);
    } catch (error) {
        throw new AsymmetricKeyIOError(`Failed to export public key`, error);
    }
}

/**
 * Imports an ECDH public key from a Uint8Array.
 * @param ephemeralPublicKey The public key as a Uint8Array.
 * @returns The restored CryptoKey.
 * @throws Error if import fails.
 */
export async function importECDHPublicKey(
    ephemeralPublicKey: Uint8Array<ArrayBuffer>,
    curve: ECDH_CURVES = DEFAULT_ECDH_CURVE
): Promise<CryptoKey> {
    try {
        return await webCrypto.subtle.importKey(
            "raw",
            ephemeralPublicKey,
            {
                name: "ECDH",
                namedCurve: curve,
            },
            true, // extractable
            [] // PublicKey has no usages.
        );
    } catch (error) {
        throw new AsymmetricKeyIOError(`Failed to restore public key from ephemeral key:`, error);
    }
}

/**
 * Generates an initialisation vector (IV) of the specified length.
 * @param length The IV length in bytes (default: 12).
 * @returns The generated IV.
 * @throws Error if the length is not positive.
 */
export function generateIV(length: number = AES_GCM_IV_LENGTH) {
    if (length <= 0) {
        throw new AsymmetricEncryptionArgumentError("IV length must be a positive integer");
    }
    const iv = webCrypto.getRandomValues(new Uint8Array(length));
    return iv;
}

/**
 * Exports a key pair (public and private keys) in a format suitable for storage or transmission.
 * @param keyPair The key pair to export.
 * @returns The exported public and private keys as Base64-encoded strings.
 */
export async function exportKeyPair(keyPair: CryptoKeyPair): Promise<{ publicKey: string; privateKey: string }> {
    const publicKey = await exportPublicKey(keyPair.publicKey);
    const privateKey = await exportPrivateKey(keyPair.privateKey);
    return { publicKey, privateKey };
}

/**
 * Exports a public key in JWK format and returns it as a Base64-encoded string.
 * @param publicKey The public key to export.
 * @returns The Base64-encoded public key.
 * @throws Error if export fails.
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
    try {
        const exported = await webCrypto.subtle.exportKey("jwk", publicKey);
        const exportedString = JSON.stringify(exported);
        const arrayBuffer = writeString(exportedString);
        return arrayBufferToBase64Single(arrayBuffer); // Convert the string to a Base64-encoded string
    } catch (error) {
        throw new AsymmetricKeyIOError(`Failed to export public key:`, error);
    }
}

/**
 * Exports a private key in JWK format and returns it as a Base64-encoded string.
 * @param privateKey The private key to export.
 * @returns The Base64-encoded private key.
 * @throws Error if export fails.
 */
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
    try {
        const exported = await webCrypto.subtle.exportKey("jwk", privateKey);
        const exportedString = JSON.stringify(exported);
        const arrayBuffer = writeString(exportedString);
        return arrayBufferToBase64Single(arrayBuffer); // Convert the string to a Base64-encoded string
    } catch (error) {
        throw new AsymmetricKeyIOError(`Failed to export private key:`, error);
    }
}
/**
 * Restores a CryptoKey from a Base64-encoded public key string.
 * @param publicKeyString The Base64-encoded public key.
 * @returns The restored public key.
 * @throws Error if import fails or the key format is invalid.
 */
export async function importEncryptionPublicKey(publicKeyString: string): Promise<CryptoKey> {
    try {
        // Decode Base64 string to JSON
        const buf = base64ToArrayBuffer(publicKeyString);
        const publicKeyJson = JSON.parse(readString(new Uint8Array(buf)));
        return await crypto.subtle.importKey("jwk", publicKeyJson, { name: "RSA-OAEP", hash: "SHA-256" }, true, [
            "encrypt",
            "wrapKey",
        ]);
    } catch (error) {
        throw new AsymmetricKeyIOError(`Failed to import public key:`, error);
    }
}

/**
 * Restores a CryptoKey from a Base64-encoded private key string.
 * @param privateKeyString The Base64-encoded private key.
 * @returns The restored private key.
 * @throws Error if import fails or the key format is invalid.
 */
export async function importEncryptionPrivateKey(privateKeyString: string): Promise<CryptoKey> {
    try {
        const privateKeyJson = JSON.parse(readString(new Uint8Array(base64ToArrayBuffer(privateKeyString))));
        return await crypto.subtle.importKey("jwk", privateKeyJson, { name: "RSA-OAEP", hash: "SHA-256" }, true, [
            "decrypt",
            "unwrapKey",
        ]);
    } catch (error) {
        throw new AsymmetricKeyIOError(`Failed to import private key:`, error);
    }
}

/**
 * Converts a 32-bit integer value to a big-endian Uint8Array (4 bytes).
 * @param length The integer value to convert (must be non-negative).
 * @returns The big-endian Uint8Array.
 * @throws Error if the length is invalid.
 */
export function lengthToBigEndianBytes(length: number): Uint8Array {
    if (length < 0 || length > 0xffffffff) {
        throw new Error("Length must be a valid 32-bit unsigned integer");
    }
    if (!Number.isInteger(length)) {
        throw new Error("Length must be an integer");
    }

    const buffer = new ArrayBuffer(LENGTH_FIELD_SIZE);
    const view = new DataView(buffer);
    view.setUint32(0, length, false); // Big-endian
    return new Uint8Array(buffer);
}

/**
 * Converts a big-endian Uint8Array (4 bytes) to a 32-bit integer value.
 * @param bytes The Uint8Array to convert (must be exactly 4 bytes).
 * @returns The converted integer value.
 * @throws Error if the bytes array is invalid.
 */
export function bigEndianBytesToLength(bytes: Uint8Array): number {
    if (bytes.length !== LENGTH_FIELD_SIZE) {
        throw new Error(`Length bytes must be exactly ${LENGTH_FIELD_SIZE} bytes, got ${bytes.length}`);
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
    return view.getUint32(0, false); // Big-endian
}

/**
 * Creates a reader that reads a specified number of bytes at a time from a Uint8Array.
 * Bounds checking is provided to prevent buffer overrun attacks.
 * @param array The Uint8Array to read from.
 * @returns The reader object with a read method.
 * @throws Error if read operations exceed array bounds.
 */
export function uint8ArrayReader(array: Uint8Array): ReadableArray {
    let cursor = 0;
    return {
        read: (length: number): Uint8Array<ArrayBuffer> => {
            if (length < 0) {
                throw new Error("Read length must be non-negative");
            }
            if (cursor + length > array.length) {
                throw new Error(
                    `Cannot read ${length} bytes: would exceed array bounds (${array.length - cursor} bytes remaining)`
                );
            }
            const result = new Uint8Array(array.slice(cursor, cursor + length));
            cursor += length;
            return result;
        },
    };
}
