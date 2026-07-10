export declare const ECDH_CURVE_INDEX: {
    readonly "P-256": 0;
    readonly "P-384": 1;
    readonly "P-521": 2;
};
export declare const ECDH_CURVE_NAMES: {
    readonly 0: "P-256";
    readonly 1: "P-384";
    readonly 2: "P-521";
};
export declare const webCrypto: Crypto;
export type ECDH_CURVES = "P-256" | "P-384" | "P-521";
export declare const DEFAULT_RSA_MODULUS_LENGTH = 3072;
export declare const DEFAULT_RSA_PUBLIC_EXPONENT: Uint8Array<ArrayBuffer>;
export declare const AES_KEY_LENGTH = 256;
export declare const AES_GCM_IV_LENGTH = 12;
export declare const DEFAULT_ECDH_CURVE = "P-256";
export declare const LENGTH_FIELD_SIZE = 4;
export declare const HEAD_RSA: Uint8Array<ArrayBuffer>;
export declare const HEAD_ECDH: Uint8Array<ArrayBuffer>;
export declare const IV_LENGTH = 12;
/**
 * Configuration options for generating cryptographic keys.
 */
export type CryptographicKeyConfig = {
    /** RSA modulus length in bits. Minimum 2048, recommended 3072+. */
    modulusLength?: number;
    /** RSA public exponent. Default is 65537 (0x010001). */
    publicExponent?: Uint8Array<ArrayBuffer>;
};
export type ReadableArray = {
    read: (length: number) => Uint8Array<ArrayBuffer>;
};
export type SessionKey = {
    key: CryptoKey;
    iv: Uint8Array<ArrayBuffer>;
};
export declare class AsymmetricEncryptionErrorBase extends Error {
    name: string;
    constructor(message: string, baseError?: any);
}
export declare class AsymmetricEncryptionError extends AsymmetricEncryptionErrorBase {
    name: string;
}
export declare class AsymmetricDecryptionError extends AsymmetricEncryptionErrorBase {
    name: string;
}
export declare class AsymmetricKeyGenerationError extends AsymmetricEncryptionErrorBase {
    name: string;
}
export declare class AsymmetricEncryptionArgumentError extends AsymmetricEncryptionErrorBase {
    name: string;
}
export declare class AsymmetricKeyIOError extends AsymmetricEncryptionErrorBase {
    name: string;
}
