import { describe, it, expect } from "vitest";
import * as keys from "./keys.ts";
import { AES_GCM_IV_LENGTH } from "./common.ts";

describe("keys.ts", () => {
    it("generateEncryptionKeyPair: The generated RSA key pair has the correct usage", async () => {
        const keyPair = await keys.generateEncryptionKeyPair();
        expect(keyPair).toHaveProperty("publicKey");
        expect(keyPair).toHaveProperty("privateKey");
        expect(keyPair.publicKey.type).toBe("public");
        expect(keyPair.privateKey.type).toBe("private");
    });

    it("generateAgreementKeyPair: ECDH key pair generation", async () => {
        const keyPair = await keys.generateAgreementKeyPair();
        expect(keyPair.publicKey.algorithm.name).toBe("ECDH");
        expect(keyPair.privateKey.algorithm.name).toBe("ECDH");
    });

    it("generateAESSessionKey: AES session key and IV generation", async () => {
        const session = await keys.generateAESSessionKey();
        expect(session).toHaveProperty("key");
        expect(session).toHaveProperty("iv");
        expect(session.iv.length).toBeGreaterThan(0);
    });

    it("generateSharedSecretKey: ECDH shared secret key generation", async () => {
        const alice = await keys.generateAgreementKeyPair();
        const bob = await keys.generateAgreementKeyPair();
        const alicePub = await keys.exportECDHPublicKey(alice.publicKey);
        const bobPub = await keys.exportECDHPublicKey(bob.publicKey);
        const alicePubKey = await keys.importECDHPublicKey(alicePub);
        const bobPubKey = await keys.importECDHPublicKey(bobPub);

        const aliceSecret = await keys.generateSharedSecretKey(alice.privateKey, bobPubKey);
        const bobSecret = await keys.generateSharedSecretKey(bob.privateKey, alicePubKey);

        // Confirm that the algorithm names of the keys match
        expect(aliceSecret.algorithm.name).toBe("AES-GCM");
        expect(bobSecret.algorithm.name).toBe("AES-GCM");
    });

    it("export/import RSA public/private key", async () => {
        const keyPair = await keys.generateEncryptionKeyPair();
        const exported = await keys.exportKeyPair(keyPair);

        const importedPub = await keys.importEncryptionPublicKey(exported.publicKey);
        const importedPriv = await keys.importEncryptionPrivateKey(exported.privateKey);

        expect(importedPub.type).toBe("public");
        expect(importedPriv.type).toBe("private");
    });

    it("lengthToBigEndianBytes/bigEndianBytesToLength: Round-trip conversion", () => {
        const n = 1234567890;
        const bytes = keys.lengthToBigEndianBytes(n);
        expect(bytes.length).toBe(4);
        const restored = keys.bigEndianBytesToLength(bytes);
        expect(restored).toBe(n);
    });

    it("uint8ArrayReader: Can read normally", () => {
        const arr = new Uint8Array([1, 2, 3, 4, 5]);
        const reader = keys.uint8ArrayReader(arr);
        expect(reader.read(2)).toEqual(new Uint8Array([1, 2]));
        expect(reader.read(3)).toEqual(new Uint8Array([3, 4, 5]));
    });

    it("uint8ArrayReader: Throws an exception when accessing out of bounds", () => {
        const arr = new Uint8Array([1, 2, 3]);
        const reader = keys.uint8ArrayReader(arr);
        reader.read(2);
        expect(() => reader.read(2)).toThrow();
    });

    describe("generateIV", () => {
        it("can generate an IV of the specified length", () => {
            const iv = keys.generateIV(16);
            expect(iv).toBeInstanceOf(Uint8Array);
            expect(iv.length).toBe(16);
        });

        it("can generate an IV with the default length", () => {
            const iv = keys.generateIV();
            expect(iv).toBeInstanceOf(Uint8Array);
            // The default length is AES_GCM_IV_LENGTH
            expect(iv.length).toBe(AES_GCM_IV_LENGTH ?? 12);
        });

        it("throws an exception when length 0 is specified", () => {
            expect(() => keys.generateIV(0)).toThrow("IV length must be a positive integer");
        });

        it("throws an exception when a negative length is specified", () => {
            expect(() => keys.generateIV(-5)).toThrow("IV length must be a positive integer");
        });
    });

    it("generateEncryptionKeyPair: Throws an exception if modulusLength is less than 2048", async () => {
        await expect(keys.generateEncryptionKeyPair({ modulusLength: 1024 })).rejects.toThrow();
    });

    it("lengthToBigEndianBytes: Throws an exception for negative numbers", () => {
        expect(() => keys.lengthToBigEndianBytes(-1)).toThrow();
    });

    it("bigEndianBytesToLength: Throws an exception if not 4 bytes", () => {
        expect(() => keys.bigEndianBytesToLength(new Uint8Array([1, 2, 3]))).toThrow();
    });

    it("generateEncryptionKeyPair: Throws an exception on failure", async () => {
        // Force failure with invalid parameters
        await expect(keys.generateEncryptionKeyPair({ modulusLength: 1024 })).rejects.toThrowError();
    });

    it("generateAgreementKeyPair: Throws an exception on failure", async () => {
        // Force failure by specifying a non-existent curve name
        // @ts-expect-error Intentionally passing an invalid value
        await expect(keys.generateAgreementKeyPair("INVALID_CURVE")).rejects.toThrowError();
    });

    it("exportPublicKey: Throws an exception for an invalid key", async () => {
        // @ts-expect-error Intentionally passing an invalid value
        await expect(keys.exportPublicKey(null)).rejects.toThrowError();
    });

    it("importECDHPublicKey: Throws an exception for an invalid public key", async () => {
        // Pass an invalid Uint8Array (length 0) to trigger an exception
        await expect(keys.importECDHPublicKey(new Uint8Array([]))).rejects.toThrowError();
    });
});

describe("Exception path tests", () => {
    it("generateAESSessionKey: Throws an exception if webCrypto.subtle.generateKey fails", async () => {
        // Force failure with a mock
        const orig = globalThis.crypto.subtle.generateKey;
        // @ts-ignore
        globalThis.crypto.subtle.generateKey = () => {
            throw new Error("mock error");
        };

        await expect(keys.generateAESSessionKey()).rejects.toThrow("mock error");
        // @ts-ignore
        globalThis.crypto.subtle.generateKey = orig;
    });

    it("generateSharedSecretKey: Throws if publicKey is not ECDH", async () => {
        // @ts-ignore
        const fakeKey = { algorithm: { name: "RSA-OAEP" } };
        // @ts-ignore
        await expect(keys.generateSharedSecretKey({}, fakeKey)).rejects.toThrow(
            "Recipient public key must be an ECDH key"
        );
    });

    it("exportECDHPublicKey: Throws if webCrypto.subtle.exportKey fails", async () => {
        const orig = globalThis.crypto.subtle.exportKey;
        // @ts-ignore
        globalThis.crypto.subtle.exportKey = () => {
            throw new Error("export error");
        };
        // @ts-ignore
        await expect(keys.exportECDHPublicKey({})).rejects.toThrow("export error");
        // @ts-ignore
        globalThis.crypto.subtle.exportKey = orig;
    });

    it("importECDHPublicKey: Throws if webCrypto.subtle.importKey fails", async () => {
        const orig = globalThis.crypto.subtle.importKey;
        // @ts-ignore
        globalThis.crypto.subtle.importKey = () => {
            throw new Error("import error");
        };
        await expect(keys.importECDHPublicKey(new Uint8Array([1, 2, 3]))).rejects.toThrow("import error");
        // @ts-ignore
        globalThis.crypto.subtle.importKey = orig;
    });

    it("exportPublicKey: Throws if webCrypto.subtle.exportKey fails", async () => {
        const orig = globalThis.crypto.subtle.exportKey;
        // @ts-ignore
        globalThis.crypto.subtle.exportKey = () => {
            throw new Error("fail export");
        };
        // @ts-ignore
        await expect(keys.exportPublicKey({})).rejects.toThrow("fail export");
        // @ts-ignore
        globalThis.crypto.subtle.exportKey = orig;
    });

    it("exportPrivateKey: Throws if webCrypto.subtle.exportKey fails", async () => {
        const orig = globalThis.crypto.subtle.exportKey;
        // @ts-ignore
        globalThis.crypto.subtle.exportKey = () => {
            throw new Error("fail export priv");
        };

        // @ts-ignore
        await expect(keys.exportPrivateKey({})).rejects.toThrow("fail export priv");
        // @ts-ignore
        globalThis.crypto.subtle.exportKey = orig;
    });

    it("importEncryptionPublicKey: Throws for invalid Base64 or JSON", async () => {
        await expect(keys.importEncryptionPublicKey("!!!notbase64!!!")).rejects.toThrow();
    });

    it("importEncryptionPrivateKey: Throws for invalid Base64 or JSON", async () => {
        await expect(keys.importEncryptionPrivateKey("!!!notbase64!!!")).rejects.toThrow();
    });

    it("lengthToBigEndianBytes: Throws for out-of-range 32-bit values", () => {
        expect(() => keys.lengthToBigEndianBytes(0x1_0000_0000)).toThrow();
        expect(() => keys.lengthToBigEndianBytes(-1)).toThrow();
        expect(() => keys.lengthToBigEndianBytes(1.5)).toThrow();
    });

    it("uint8ArrayReader: Throws for negative length", () => {
        const arr = new Uint8Array([1, 2, 3]);
        const reader = keys.uint8ArrayReader(arr);
        expect(() => reader.read(-1)).toThrow();
    });
});

describe("generateEncryptionKeyPair error message", () => {
    it("should throw with message starting with 'Failed to generate RSA key pair:' on error", async () => {
        // Force failure with a mock
        const orig = globalThis.crypto.subtle.generateKey;
        // @ts-ignore
        globalThis.crypto.subtle.generateKey = () => {
            throw new Error("mock RSA error");
        };
        await expect(keys.generateEncryptionKeyPair()).rejects.toThrow(
            /^Failed to generate RSA key pair: mock RSA error/
        );
        // @ts-ignore
        globalThis.crypto.subtle.generateKey = orig;
    });
});
