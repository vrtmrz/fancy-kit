/**
 * Asymmetric encryption and decryption using the Web Crypto API.
 * This module provides hybrid encryption, combining RSA-OAEP and AES-GCM.
 *
 * Features:
 * - Hybrid RSA-OAEP + AES-GCM encryption for large data sets,
 * - ECDH (Elliptic Curve Diffie-Hellman) key agreement with ephemeral keys,
 * - Authenticated encryption with integrity verification,
 * - Secure key wrapping and session key generation.
 *
 * The hybrid approach uses:
 * - RSA-OAEP for key wrapping (encrypting the AES session key),
 * - AES-GCM for data encryption (provides authenticated encryption),
 * - ECDH for ephemeral key agreement and forward secrecy.
 *
 * Data formats:
 * - RSA hybrid: [HEAD_RSA(3), iv(12), wrappedAesKeyLength(4), wrappedAesKey(variable), encryptedDataLength(4), encryptedData(variable)],
 * - ECDH: [HEAD_ECDH(3), iv(12), ephemeralPublicKeyLength(4), ephemeralPublicKey(variable), encryptedDataLength(4), encryptedData(variable)].
 *
 * Security considerations:
 * - Uses AES-256-GCM with 128-bit authentication tags,
 * - IV/nonce is randomly generated for each encryption operation,
 * - RSA keys should be 3072+ bits for long-term security,
 * - ECDH uses the P-256 curve for ephemeral key generation.
 */
import type { ECDH_CURVES } from "./common.ts";
/**
 * Encrypts a Uint8Array using a session key (AES-GCM).
 * AES-GCM provides authenticated encryption (AEAD).
 * @param data The data to be encrypted
 * @param aesKey The AES key to use for encryption
 * @param iv The initialisation vector (IV) for encryption
 * @returns The encrypted data as an ArrayBuffer (includes authentication tag)
 */
export declare function encryptUInt8ArrayWithSessionKey(data: ArrayBuffer | Uint8Array<ArrayBuffer>, aesKey: CryptoKey, iv: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer>;
/**
 * Wraps (encrypts) an AES key using an RSA public key.
 * @param aesKey The AES key to wrap
 * @param publicKey The RSA public key to use for wrapping
 * @returns The wrapped AES key as an ArrayBuffer
 */
export declare function wrapAesKeyWithPublicKey(aesKey: CryptoKey, publicKey: CryptoKey): Promise<ArrayBuffer>;
/**
 * Encrypts a Uint8Array using a hybrid method of RSA-OAEP and AES-GCM.
 * @param data The data to be encrypted
 * @param publicKey The RSA public key to use for encryption
 * @returns The encrypted data as a Uint8Array
 */
export declare function encryptUInt8Array(data: Uint8Array<ArrayBuffer>, publicKey: CryptoKey): Promise<Uint8Array<ArrayBuffer>>;
/**
 * Decrypts data encrypted with the hybrid method of RSA-OAEP and AES-GCM.
 * @param encryptedInfo The encrypted data (Uint8Array)
 * @param privateKey The RSA private key to use for decryption
 * @returns The decrypted data (Uint8Array)
 */
export declare function decryptUInt8Array(encryptedInfo: Uint8Array, privateKey: CryptoKey): Promise<Uint8Array<ArrayBuffer>>;
/**
 * Encrypts a Uint8Array using ECDH (Elliptic Curve Diffie-Hellman) and AES-GCM.
 * Generates an ephemeral ECDH key pair, derives a shared secret, and encrypts the data.
 * The ephemeral public key is included in the output for decryption.
 * @param data The data to be encrypted
 * @param recipientPublicKey The recipient's ECDH public key
 * @returns The encrypted data as a Uint8Array
 * @throws Error if the recipient public key is not ECDH
 */
export declare function encryptUInt8ArrayWithPublicKey(data: Uint8Array<ArrayBuffer>, recipientPublicKey: CryptoKey, expectedCurve?: ECDH_CURVES): Promise<Uint8Array<ArrayBuffer>>;
/**
 * Decrypts data encrypted with ECDH and AES-GCM using the private key.
 * Extracts the ephemeral public key, derives the shared secret, and decrypts the data.
 * @param encryptedData The encrypted data as a Uint8Array
 * @param privateKey The ECDH private key
 * @returns The decrypted data as a Uint8Array
 * @throws Error if the data format is invalid
 */
export declare function decryptUInt8ArrayWithPrivateKey(encryptedData: Uint8Array, privateKey: CryptoKey): Promise<Uint8Array>;
