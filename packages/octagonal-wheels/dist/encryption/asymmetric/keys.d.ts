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
import { type CryptographicKeyConfig, type ReadableArray, type SessionKey } from "./common.ts";
import { type ECDH_CURVES } from "./common.ts";
/**
 * Generates a key pair for RSA encryption.
 * @param options Options for key generation, such as modulusLength and publicExponent.
 * @returns The generated RSA key pair.
 * @throws Error if key generation fails.
 */
export declare function generateEncryptionKeyPair(options?: CryptographicKeyConfig): Promise<CryptoKeyPair>;
/**
 * Generates a key pair for ECDH key agreement.
 * @param namedCurve The elliptic curve to use. "P-256" is a suitable default.
 * @returns The generated ECDH key pair.
 * @throws Error if key generation fails.
 */
export declare function generateAgreementKeyPair(namedCurve?: ECDH_CURVES): Promise<CryptoKeyPair>;
/**
 * Generates a new AES session key for data encryption.
 * AES-256-GCM is used for authenticated encryption.
 * @returns The new AES session key and IV.
 * @throws Error if key generation fails.
 */
export declare function generateAESSessionKey(): Promise<SessionKey>;
export declare function generateSharedSecretKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey>;
/**
 * Exports an ECDH public key as a Uint8Array.
 * @param publicKey The ECDH public key to export.
 * @returns The exported public key as a Uint8Array.
 * @throws Error if export fails.
 */
export declare function exportECDHPublicKey(publicKey: CryptoKey): Promise<Uint8Array>;
/**
 * Imports an ECDH public key from a Uint8Array.
 * @param ephemeralPublicKey The public key as a Uint8Array.
 * @returns The restored CryptoKey.
 * @throws Error if import fails.
 */
export declare function importECDHPublicKey(ephemeralPublicKey: Uint8Array<ArrayBuffer>, curve?: ECDH_CURVES): Promise<CryptoKey>;
/**
 * Generates an initialisation vector (IV) of the specified length.
 * @param length The IV length in bytes (default: 12).
 * @returns The generated IV.
 * @throws Error if the length is not positive.
 */
export declare function generateIV(length?: number): Uint8Array<ArrayBuffer>;
/**
 * Exports a key pair (public and private keys) in a format suitable for storage or transmission.
 * @param keyPair The key pair to export.
 * @returns The exported public and private keys as Base64-encoded strings.
 */
export declare function exportKeyPair(keyPair: CryptoKeyPair): Promise<{
    publicKey: string;
    privateKey: string;
}>;
/**
 * Exports a public key in JWK format and returns it as a Base64-encoded string.
 * @param publicKey The public key to export.
 * @returns The Base64-encoded public key.
 * @throws Error if export fails.
 */
export declare function exportPublicKey(publicKey: CryptoKey): Promise<string>;
/**
 * Exports a private key in JWK format and returns it as a Base64-encoded string.
 * @param privateKey The private key to export.
 * @returns The Base64-encoded private key.
 * @throws Error if export fails.
 */
export declare function exportPrivateKey(privateKey: CryptoKey): Promise<string>;
/**
 * Restores a CryptoKey from a Base64-encoded public key string.
 * @param publicKeyString The Base64-encoded public key.
 * @returns The restored public key.
 * @throws Error if import fails or the key format is invalid.
 */
export declare function importEncryptionPublicKey(publicKeyString: string): Promise<CryptoKey>;
/**
 * Restores a CryptoKey from a Base64-encoded private key string.
 * @param privateKeyString The Base64-encoded private key.
 * @returns The restored private key.
 * @throws Error if import fails or the key format is invalid.
 */
export declare function importEncryptionPrivateKey(privateKeyString: string): Promise<CryptoKey>;
/**
 * Converts a 32-bit integer value to a big-endian Uint8Array (4 bytes).
 * @param length The integer value to convert (must be non-negative).
 * @returns The big-endian Uint8Array.
 * @throws Error if the length is invalid.
 */
export declare function lengthToBigEndianBytes(length: number): Uint8Array;
/**
 * Converts a big-endian Uint8Array (4 bytes) to a 32-bit integer value.
 * @param bytes The Uint8Array to convert (must be exactly 4 bytes).
 * @returns The converted integer value.
 * @throws Error if the bytes array is invalid.
 */
export declare function bigEndianBytesToLength(bytes: Uint8Array): number;
/**
 * Creates a reader that reads a specified number of bytes at a time from a Uint8Array.
 * Bounds checking is provided to prevent buffer overrun attacks.
 * @param array The Uint8Array to read from.
 * @returns The reader object with a read method.
 * @throws Error if read operations exceed array bounds.
 */
export declare function uint8ArrayReader(array: Uint8Array): ReadableArray;
