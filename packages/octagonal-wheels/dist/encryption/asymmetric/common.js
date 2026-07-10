const ECDH_CURVE_INDEX = {
    "P-256": 0,
    "P-384": 1,
    "P-521": 2,
};
const ECDH_CURVE_NAMES = {
    0: "P-256",
    1: "P-384",
    2: "P-521",
};
// Naive fallback for crypto
/* istanbul ignore next -- @preserve */
const webCrypto = globalThis.crypto || window.crypto;
const DEFAULT_RSA_MODULUS_LENGTH = 3072; // Bits – NIST recommendation for 2030+
const DEFAULT_RSA_PUBLIC_EXPONENT = new Uint8Array([0x01, 0x00, 0x01]); // 65537 (F4)
const AES_KEY_LENGTH = 256; // Bits – AES-256
const AES_GCM_IV_LENGTH = 12; // Bytes – 96 bits, recommended for AES-GCM
const DEFAULT_ECDH_CURVE = "P-256"; // Default elliptic curve for ECDH key agreement
const LENGTH_FIELD_SIZE = 4; // Bytes – for big-endian length encoding
// RSA
const HEAD_RSA = new Uint8Array([0x0a, 0xf4, 0xc1]); // Magic header for identifying the encrypted data format
const HEAD_ECDH = new Uint8Array([0x0a, 0xf4, 0xc2]); // Magic header for ECDH encrypted data format
const IV_LENGTH = 12; // AES-GCM IV length in bytes (96 bits)
class AsymmetricEncryptionErrorBase extends Error {
    constructor(message, baseError) {
        const baseErrorMessage = baseError instanceof Error
            ? baseError.message
            : baseError && typeof baseError === "object"
                ? JSON.stringify(baseError)
                : String(baseError);
        if (baseErrorMessage) {
            message = `${message}: ${baseErrorMessage}`;
        }
        super(message);
        // innerError?: Error;
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "AsymmetricEncryptionErrorBase"
        });
        // this.innerError = baseError;
        if (baseError) {
            // Preserve the original stack trace
            this.stack = baseError.stack;
        }
    }
}
class AsymmetricEncryptionError extends AsymmetricEncryptionErrorBase {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "AsymmetricEncryptionError"
        });
    }
}
class AsymmetricDecryptionError extends AsymmetricEncryptionErrorBase {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "AsymmetricDecryptionError"
        });
    }
}
class AsymmetricKeyGenerationError extends AsymmetricEncryptionErrorBase {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "AsymmetricKeyGenerationError"
        });
    }
}
class AsymmetricEncryptionArgumentError extends AsymmetricEncryptionErrorBase {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "AsymmetricEncryptionArgumentError"
        });
    }
}
class AsymmetricKeyIOError extends AsymmetricEncryptionErrorBase {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "AsymmetricKeyIOError"
        });
    }
}

export { AES_GCM_IV_LENGTH, AES_KEY_LENGTH, AsymmetricDecryptionError, AsymmetricEncryptionArgumentError, AsymmetricEncryptionError, AsymmetricEncryptionErrorBase, AsymmetricKeyGenerationError, AsymmetricKeyIOError, DEFAULT_ECDH_CURVE, DEFAULT_RSA_MODULUS_LENGTH, DEFAULT_RSA_PUBLIC_EXPONENT, ECDH_CURVE_INDEX, ECDH_CURVE_NAMES, HEAD_ECDH, HEAD_RSA, IV_LENGTH, LENGTH_FIELD_SIZE, webCrypto };
//# sourceMappingURL=common.js.map
