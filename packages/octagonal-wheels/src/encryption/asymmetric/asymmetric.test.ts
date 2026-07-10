import { describe, it, expect } from "vitest";
import {
    encryptUInt8Array,
    decryptUInt8Array,
    encryptUInt8ArrayWithPublicKey,
    decryptUInt8ArrayWithPrivateKey,
} from "./asymmetric.ts";
import { generateAgreementKeyPair } from "./keys.ts";
import { DEFAULT_ECDH_CURVE, HEAD_ECDH, webCrypto } from "./common.ts";
import { AsymmetricEncryptionArgumentError } from "./common.ts";
import { AsymmetricEncryptionError } from "./common.ts";

describe("asymmetric.ts", () => {
    it("encrypts and decrypts with RSA-OAEP + AES-GCM (hybrid)", async () => {
        // 1. Generate key pair
        const { publicKey, privateKey } = await webCrypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
        );
        // 2. Data
        const plain = new TextEncoder().encode("Hello Hybrid RSA-OAEP + AES-GCM!");
        // 3. Encrypt
        const encrypted = await encryptUInt8Array(plain, publicKey);
        // 4. Decrypt
        const decrypted = await decryptUInt8Array(encrypted, privateKey);
        // 5. Verify
        expect(new TextDecoder().decode(decrypted)).toBe("Hello Hybrid RSA-OAEP + AES-GCM!");
    });

    it("encrypts and decrypts with ECDH + AES-GCM (hybrid)", async () => {
        // 1. Generate ECDH key pair
        const { publicKey, privateKey } = await generateAgreementKeyPair(DEFAULT_ECDH_CURVE);
        // 2. Data
        const plain = new TextEncoder().encode("Hello ECDH + AES-GCM!");
        // 3. Encrypt
        const encrypted = await encryptUInt8ArrayWithPublicKey(plain, publicKey);
        // 4. Decrypt
        const decrypted = await decryptUInt8ArrayWithPrivateKey(encrypted, privateKey);
        // 5. Verify
        expect(new TextDecoder().decode(decrypted)).toBe("Hello ECDH + AES-GCM!");
    });

    it("encrypts and decrypts with ECDH + AES-GCM (hybrid) with a different curve", async () => {
        const CURVE = "P-384"; // Use P-384 curve for ECDH
        // 1. Generate ECDH key pair
        const { publicKey, privateKey } = await generateAgreementKeyPair(CURVE);
        // 2. Data
        const plain = new TextEncoder().encode("Hello ECDH + AES-GCM!");
        // 3. Encrypt
        const encrypted = await encryptUInt8ArrayWithPublicKey(plain, publicKey, CURVE);
        // 4. Decrypt
        const decrypted = await decryptUInt8ArrayWithPrivateKey(encrypted, privateKey);
        // 5. Verify
        expect(new TextDecoder().decode(decrypted)).toBe("Hello ECDH + AES-GCM!");
    });
});

describe("encryptUInt8ArrayWithPublicKey", () => {
    it("encrypts and decrypts data correctly with ECDH", async () => {
        const { publicKey, privateKey } = await generateAgreementKeyPair(DEFAULT_ECDH_CURVE);
        const plain = new TextEncoder().encode("test ECDH hybrid");
        const encrypted = await encryptUInt8ArrayWithPublicKey(plain, publicKey, DEFAULT_ECDH_CURVE);
        const decrypted = await decryptUInt8ArrayWithPrivateKey(encrypted, privateKey);
        expect(new TextDecoder().decode(decrypted)).toBe("test ECDH hybrid");
    });

    it("throws if recipientPublicKey is not ECDH", async () => {
        // Generate RSA key for negative test
        const { publicKey } = await crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
        );
        const plain = new Uint8Array([1, 2, 3]);
        await expect(encryptUInt8ArrayWithPublicKey(plain, publicKey, DEFAULT_ECDH_CURVE)).rejects.toThrow(
            AsymmetricEncryptionError
        );
    });

    it("throws if curve index is invalid on decrypt", async () => {
        const { publicKey, privateKey } = await generateAgreementKeyPair(DEFAULT_ECDH_CURVE);
        const plain = new TextEncoder().encode("curve index error");
        const encrypted = await encryptUInt8ArrayWithPublicKey(plain, publicKey, DEFAULT_ECDH_CURVE);
        // Tamper: overwrite curve index with an invalid value
        const tampered = new Uint8Array(encrypted);
        tampered[HEAD_ECDH.length] = 99; // 99 is an undefined curve index
        await expect(decryptUInt8ArrayWithPrivateKey(tampered, privateKey)).rejects.toThrow(
            AsymmetricEncryptionArgumentError
        );
    });
    it("throws if curve index is invalid on decrypt (broken header)", async () => {
        const { publicKey, privateKey } = await generateAgreementKeyPair(DEFAULT_ECDH_CURVE);
        const plain = new TextEncoder().encode("curve index error");
        const encrypted = await encryptUInt8ArrayWithPublicKey(plain, publicKey, DEFAULT_ECDH_CURVE);
        // Tamper: overwrite header with an invalid value
        const tampered = new Uint8Array(encrypted);
        tampered[0] = 0x00; // Invalid header
        await expect(decryptUInt8ArrayWithPrivateKey(tampered, privateKey)).rejects.toThrow(
            AsymmetricEncryptionArgumentError
        );
    });
});

describe("decryptUInt8Array", () => {
    it("decrypts valid RSA-OAEP + AES-GCM hybrid data", async () => {
        const { publicKey, privateKey } = await webCrypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
        );
        const plain = new TextEncoder().encode("test hybrid decrypt");
        const encrypted = await encryptUInt8Array(plain, publicKey);
        const decrypted = await decryptUInt8Array(encrypted, privateKey);
        expect(new TextDecoder().decode(decrypted)).toBe("test hybrid decrypt");
    });

    it("throws error if encrypted data is too short", async () => {
        const { privateKey } = await webCrypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: "SHA-256",
            },
            true,
            ["decrypt"]
        );
        const tooShort = new Uint8Array([1, 2, 3, 4, 5]);
        await expect(decryptUInt8Array(tooShort, privateKey)).rejects.toThrow("The encrypted data is too short.");
    });

    it("throws error if header does not match", async () => {
        const { privateKey } = await webCrypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: "SHA-256",
            },
            true,
            ["decrypt"]
        );
        // Correct length but header is different
        const fake = new Uint8Array(3 + 12 + 4 + 16 + 4 + 16);
        fake.set([0x00, 0x00, 0x00], 0); // Invalid header
        await expect(decryptUInt8Array(fake, privateKey)).rejects.toThrow("The encrypted data format is invalid.");
    });

    it("throws AsymmetricDecryptionError if authentication tag is tampered", async () => {
        const { publicKey, privateKey } = await webCrypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
        );
        const plain = new TextEncoder().encode("test tamper");
        const encrypted = await encryptUInt8Array(plain, publicKey);
        // Tamper with the authentication tag (invert the last byte)
        const tampered = new Uint8Array(encrypted);
        tampered[tampered.length - 1] ^= 0xff;
        await expect(decryptUInt8Array(tampered, privateKey)).rejects.toThrow("Decryption failed");
    });
});
