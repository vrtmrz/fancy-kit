export const ECDH_CURVE_INDEX = {
    "P-256": 0,
    "P-384": 1,
    "P-521": 2,
} as const;
export const ECDH_CURVE_NAMES = {
    0: "P-256",
    1: "P-384",
    2: "P-521",
} as const;

// Naive fallback for crypto
/* istanbul ignore next -- @preserve */
export const webCrypto = globalThis.crypto || window.crypto;

//ECDH

export type ECDH_CURVES = "P-256" | "P-384" | "P-521"; // Security constants
export const DEFAULT_RSA_MODULUS_LENGTH = 3072; // Bits – NIST recommendation for 2030+
export const DEFAULT_RSA_PUBLIC_EXPONENT = new Uint8Array([0x01, 0x00, 0x01]); // 65537 (F4)
export const AES_KEY_LENGTH = 256; // Bits – AES-256
export const AES_GCM_IV_LENGTH = 12; // Bytes – 96 bits, recommended for AES-GCM
export const DEFAULT_ECDH_CURVE = "P-256"; // Default elliptic curve for ECDH key agreement
export const LENGTH_FIELD_SIZE = 4; // Bytes – for big-endian length encoding

// RSA

export const HEAD_RSA = new Uint8Array([0x0a, 0xf4, 0xc1]); // Magic header for identifying the encrypted data format
export const HEAD_ECDH = new Uint8Array([0x0a, 0xf4, 0xc2]); // Magic header for ECDH encrypted data format
export const IV_LENGTH = 12; // AES-GCM IV length in bytes (96 bits)

/**
 * Configuration options for generating cryptographic keys.
 */
export type CryptographicKeyConfig = {
    /** RSA modulus length in bits. Minimum 2048, recommended 3072+. */
    modulusLength?: number;
    /** RSA public exponent. Default is 65537 (0x010001). */
    publicExponent?: Uint8Array<ArrayBuffer>;
};
export type ReadableArray = { read: (length: number) => Uint8Array<ArrayBuffer> };

export type SessionKey = {
    key: CryptoKey;
    iv: Uint8Array<ArrayBuffer>;
};

export class AsymmetricEncryptionErrorBase extends Error {
    // innerError?: Error;
    override name = "AsymmetricEncryptionErrorBase";
    constructor(message: string, baseError?: any) {
        const baseErrorMessage =
            baseError instanceof Error
                ? baseError.message
                : baseError && typeof baseError === "object"
                  ? JSON.stringify(baseError)
                  : String(baseError);
        if (baseErrorMessage) {
            message = `${message}: ${baseErrorMessage}`;
        }
        super(message);
        // this.innerError = baseError;
        if (baseError) {
            // Preserve the original stack trace
            this.stack = baseError.stack;
        }
    }
}

export class AsymmetricEncryptionError extends AsymmetricEncryptionErrorBase {
    override name = "AsymmetricEncryptionError";
}

export class AsymmetricDecryptionError extends AsymmetricEncryptionErrorBase {
    override name = "AsymmetricDecryptionError";
}
export class AsymmetricKeyGenerationError extends AsymmetricEncryptionErrorBase {
    override name = "AsymmetricKeyGenerationError";
}
export class AsymmetricEncryptionArgumentError extends AsymmetricEncryptionErrorBase {
    override name = "AsymmetricEncryptionArgumentError";
}

export class AsymmetricKeyIOError extends AsymmetricEncryptionErrorBase {
    override name = "AsymmetricKeyIOError";
}
