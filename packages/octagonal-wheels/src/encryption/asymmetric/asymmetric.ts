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

import { concatUInt8Array } from "../../binary/index.ts";
import {
    bigEndianBytesToLength,
    exportECDHPublicKey,
    generateAESSessionKey,
    generateAgreementKeyPair,
    generateSharedSecretKey,
    lengthToBigEndianBytes,
    importECDHPublicKey,
    uint8ArrayReader,
    generateIV,
} from "./keys.ts";
import {
    AsymmetricDecryptionError,
    AsymmetricEncryptionArgumentError,
    AsymmetricEncryptionError,
    DEFAULT_ECDH_CURVE,
    HEAD_ECDH,
    HEAD_RSA,
    IV_LENGTH,
    LENGTH_FIELD_SIZE,
    webCrypto,
} from "./common.ts";
import { ECDH_CURVE_NAMES } from "./common.ts";
import { ECDH_CURVE_INDEX } from "./common.ts";
import type { ECDH_CURVES } from "./common.ts";
/**
 * Encrypts a Uint8Array using a session key (AES-GCM).
 * AES-GCM provides authenticated encryption (AEAD).
 * @param data The data to be encrypted
 * @param aesKey The AES key to use for encryption
 * @param iv The initialisation vector (IV) for encryption
 * @returns The encrypted data as an ArrayBuffer (includes authentication tag)
 */
export async function encryptUInt8ArrayWithSessionKey(
    data: ArrayBuffer | Uint8Array<ArrayBuffer>,
    aesKey: CryptoKey,
    iv: Uint8Array<ArrayBuffer>
): Promise<ArrayBuffer> {
    const encryptedDataBuffer = await webCrypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
            // tagLength defaults to 128 bits (16 bytes) for maximum security
        },
        aesKey,
        data
    );

    return encryptedDataBuffer;
}

/**
 * Wraps (encrypts) an AES key using an RSA public key.
 * @param aesKey The AES key to wrap
 * @param publicKey The RSA public key to use for wrapping
 * @returns The wrapped AES key as an ArrayBuffer
 */
export async function wrapAesKeyWithPublicKey(aesKey: CryptoKey, publicKey: CryptoKey): Promise<ArrayBuffer> {
    const wrappedKey = await webCrypto.subtle.wrapKey("raw", aesKey, publicKey, {
        name: "RSA-OAEP",
    });
    return wrappedKey;
}

/**
 * Encrypts a Uint8Array using a hybrid method of RSA-OAEP and AES-GCM.
 * @param data The data to be encrypted
 * @param publicKey The RSA public key to use for encryption
 * @returns The encrypted data as a Uint8Array
 */
export async function encryptUInt8Array(
    data: Uint8Array<ArrayBuffer>,
    publicKey: CryptoKey
): Promise<Uint8Array<ArrayBuffer>> {
    const { key: aesKey, iv } = await generateAESSessionKey(); // Generate AES session key

    // 1. Encrypt data using AES-GCM
    const encryptedDataBuffer = await encryptUInt8ArrayWithSessionKey(data, aesKey, iv);

    // 2. Wrap (encrypt) AES key with RSA public key
    const wrappedAesKey = await wrapAesKeyWithPublicKey(aesKey, publicKey);

    const wrappedAesKeyArray = new Uint8Array(wrappedAesKey);
    const encryptedDataArray = new Uint8Array(encryptedDataBuffer);
    const wrappedAesKeyLength = lengthToBigEndianBytes(wrappedAesKeyArray.byteLength); // We represent the length of the wrapped AES key in big-endian
    const encryptedDataLength = lengthToBigEndianBytes(encryptedDataArray.byteLength); // We represent the length of the encrypted data in big-endian

    const out = [HEAD_RSA, iv, wrappedAesKeyLength, wrappedAesKeyArray, encryptedDataLength, encryptedDataArray];
    return concatUInt8Array(out);
}

/**
 * Unwraps (decrypts) an AES key using an RSA private key.
 * @param wrappedAesKeyBuffer The wrapped AES key as a Uint8Array
 * @param privateKey The RSA private key to use for unwrapping
 * @returns The unwrapped AES key as a CryptoKey
 */
async function unwrapAesKeyWithPrivateKey(
    wrappedAesKeyBuffer: Uint8Array<ArrayBuffer>,
    privateKey: CryptoKey
): Promise<CryptoKey> {
    return await webCrypto.subtle.unwrapKey(
        "raw",
        wrappedAesKeyBuffer,
        privateKey,
        {
            name: "RSA-OAEP",
        },
        {
            name: "AES-GCM",
            length: 256,
        },
        false,
        ["decrypt"]
    );
}

/**
 * Decrypts data encrypted with the hybrid method of RSA-OAEP and AES-GCM.
 * Verifies the authentication tag during decryption for data integrity.
 * @param encryptedDataBuffer The encrypted data (Uint8Array), including authentication tag
 * @param aesKey The AES key to use for decryption
 * @param iv The initialisation vector (IV) used during encryption
 * @returns The decrypted data as an ArrayBuffer
 */
async function decryptUInt8ArrayWithSessionKey(
    encryptedDataBuffer: Uint8Array<ArrayBuffer>,
    aesKey: CryptoKey,
    iv: Uint8Array<ArrayBuffer>
): Promise<ArrayBuffer> {
    return await webCrypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        aesKey,
        encryptedDataBuffer // Contains both ciphertext and authentication tag
    );
}

/**
 * Decrypts data encrypted with the hybrid method of RSA-OAEP and AES-GCM.
 * @param encryptedInfo The encrypted data (Uint8Array)
 * @param privateKey The RSA private key to use for decryption
 * @returns The decrypted data (Uint8Array)
 */
export async function decryptUInt8Array(
    encryptedInfo: Uint8Array,
    privateKey: CryptoKey
): Promise<Uint8Array<ArrayBuffer>> {
    // The minimum data length is validated.
    if (encryptedInfo.length < HEAD_RSA.length + IV_LENGTH + LENGTH_FIELD_SIZE * 2) {
        throw new AsymmetricDecryptionError("The encrypted data is too short.");
    }

    const reader = uint8ArrayReader(encryptedInfo);
    const headPart = reader.read(HEAD_RSA.length);
    if (!headPart.every((value, index) => value === HEAD_RSA[index])) {
        throw new AsymmetricDecryptionError("The encrypted data format is invalid.");
    }
    const ivBuffer = reader.read(IV_LENGTH); // IV is 12 bytes
    const keyLen = bigEndianBytesToLength(reader.read(LENGTH_FIELD_SIZE)); // Get length of wrapped AES key

    const wrappedAesKeyBuffer = reader.read(keyLen); // Wrapped AES key is keyLen bytes
    const encryptedDataLen = bigEndianBytesToLength(reader.read(LENGTH_FIELD_SIZE)); // Get length of encrypted data

    const encryptedDataBuffer = reader.read(encryptedDataLen);

    // 1. Unwrap (decrypt) AES key with the RSA private key
    const aesKey = await unwrapAesKeyWithPrivateKey(wrappedAesKeyBuffer, privateKey);

    // 2. Decrypt data with the AES key and IV
    try {
        const decryptedDataBuffer = await decryptUInt8ArrayWithSessionKey(encryptedDataBuffer, aesKey, ivBuffer);
        return new Uint8Array(decryptedDataBuffer);
    } catch (error) {
        // This error is often thrown if authentication fails,
        // which may indicate an incorrect private key or tampered data.
        throw new AsymmetricDecryptionError(`Decryption failed`, error);
    }
}

/**
 * Encrypts a Uint8Array using ECDH (Elliptic Curve Diffie-Hellman) and AES-GCM.
 * Generates an ephemeral ECDH key pair, derives a shared secret, and encrypts the data.
 * The ephemeral public key is included in the output for decryption.
 * @param data The data to be encrypted
 * @param recipientPublicKey The recipient's ECDH public key
 * @returns The encrypted data as a Uint8Array
 * @throws Error if the recipient public key is not ECDH
 */
export async function encryptUInt8ArrayWithPublicKey(
    data: Uint8Array<ArrayBuffer>,
    recipientPublicKey: CryptoKey,
    expectedCurve: ECDH_CURVES = DEFAULT_ECDH_CURVE
): Promise<Uint8Array<ArrayBuffer>> {
    if (recipientPublicKey.algorithm.name !== "ECDH") {
        throw new AsymmetricEncryptionError("The recipient public key must be an ECDH key.");
    }

    const ephemeralKeyPair = await generateAgreementKeyPair(expectedCurve);
    const curveIndex = ECDH_CURVE_INDEX[expectedCurve];
    const sharedSecret = await generateSharedSecretKey(ephemeralKeyPair.privateKey, recipientPublicKey);
    const iv = generateIV(); // Generate a random IV for AES-GCM

    // 3. Encrypts the data using AES-GCM
    const encryptedData = new Uint8Array(await encryptUInt8ArrayWithSessionKey(data, sharedSecret, iv));
    const encryptedDataLength = lengthToBigEndianBytes(encryptedData.length); // We represent the length of the encrypted data in big-endian

    // 4. Exports the ephemeral public key and includes it in the output
    // const ephemeralPublicKeyRaw = writeString(JSON.stringify(pubkeyBuf));
    const ephemeralPublicKeyRaw = await exportECDHPublicKey(ephemeralKeyPair.publicKey);
    const ephemeralPublicKeyLength = lengthToBigEndianBytes(ephemeralPublicKeyRaw.length);
    const out = [
        HEAD_ECDH,
        new Uint8Array([curveIndex]),
        iv,
        ephemeralPublicKeyLength,
        new Uint8Array(ephemeralPublicKeyRaw),
        encryptedDataLength,
        new Uint8Array(encryptedData),
    ];

    return concatUInt8Array(out);
}

/**
 * Decrypts data encrypted with ECDH and AES-GCM using the private key.
 * Extracts the ephemeral public key, derives the shared secret, and decrypts the data.
 * @param encryptedData The encrypted data as a Uint8Array
 * @param privateKey The ECDH private key
 * @returns The decrypted data as a Uint8Array
 * @throws Error if the data format is invalid
 */
export async function decryptUInt8ArrayWithPrivateKey(
    encryptedData: Uint8Array,
    privateKey: CryptoKey
): Promise<Uint8Array> {
    // 1. Extracts the ephemeral public key and other components from the encrypted data
    const reader = uint8ArrayReader(encryptedData);
    const headPart = reader.read(HEAD_ECDH.length);
    if (!headPart.every((value, index) => value === HEAD_ECDH[index])) {
        throw new AsymmetricEncryptionArgumentError("The encrypted data format is invalid.");
    }
    const curveIndex = reader.read(1)[0]; // Read the curve index (1 byte)
    if (!ECDH_CURVE_NAMES[curveIndex as keyof typeof ECDH_CURVE_NAMES]) {
        throw new AsymmetricEncryptionArgumentError("The curve index is invalid.");
    }
    const expectedCurve = ECDH_CURVE_NAMES[curveIndex as keyof typeof ECDH_CURVE_NAMES]; // Get the expected curve name from the index

    const iv = reader.read(IV_LENGTH);
    const ephemeralPublicKeyLength = bigEndianBytesToLength(reader.read(LENGTH_FIELD_SIZE));
    const ephemeralPublicKey = reader.read(ephemeralPublicKeyLength);
    const encryptedDataLength = bigEndianBytesToLength(reader.read(LENGTH_FIELD_SIZE));
    const encryptedDataBuffer = reader.read(encryptedDataLength);
    // 2. Restores the sender's ephemeral public key from the exported data
    const recipientPublicKey = await importECDHPublicKey(ephemeralPublicKey, expectedCurve);

    // 3. Derives the shared secret using the recipient's private key and the sender's public key
    const sharedSecret = await generateSharedSecretKey(privateKey, recipientPublicKey);

    // 4. Decrypts the data using the shared secret and the IV
    return new Uint8Array(await decryptUInt8ArrayWithSessionKey(encryptedDataBuffer, sharedSecret, iv));
}
