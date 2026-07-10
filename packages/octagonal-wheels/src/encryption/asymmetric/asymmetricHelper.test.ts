import { describe, it, expect } from "vitest";
import { encryptConfig, decryptConfig } from "./asymmetricHelper.ts";
import { generateAgreementKeyPair, generateEncryptionKeyPair } from "./keys.ts";
import { DEFAULT_ECDH_CURVE } from "./common.ts";
import { base64ToArrayBuffer, writeString } from "../../binary/base64.ts";
import { encryptUInt8Array } from "./asymmetric.ts";

describe("asymmetricHelper.ts", () => {
    it("encrypts and decrypts config with ECDH key pair", async () => {
        const { publicKey, privateKey } = await generateAgreementKeyPair(DEFAULT_ECDH_CURVE);
        const config = { foo: "bar", num: 42 };
        const encrypted = await encryptConfig(config, publicKey);
        // Base64 decode
        const encryptedArray = new Uint8Array(base64ToArrayBuffer(encrypted));
        const decrypted = await decryptConfig(encryptedArray, privateKey);
        expect(decrypted).toEqual(config);
    });

    it("encrypts and decrypts config with RSA-OAEP key pair", async () => {
        const { publicKey, privateKey } = await generateEncryptionKeyPair();
        const config = { hello: "world", arr: [1, 2, 3] };
        const encrypted = await encryptConfig(config, publicKey);
        const encryptedArray = new Uint8Array(base64ToArrayBuffer(encrypted));
        const decrypted = await decryptConfig(encryptedArray, privateKey);
        expect(decrypted).toEqual(config);
    });

    it("throws error for unsupported key algorithm", async () => {
        const fakeKey = { algorithm: { name: "FAKE" } };
        // @ts-expect-error purposely pass an invalid key
        await expect(encryptConfig({ a: 1 }, fakeKey)).rejects.toThrowError();
        // @ts-expect-error purposely pass an invalid key
        await expect(decryptConfig(new Uint8Array([1, 2, 3]), fakeKey)).rejects.toThrowError();
    });

    it("throws error if decrypted data is not valid JSON", async () => {
        const { publicKey, privateKey } = await generateAgreementKeyPair(DEFAULT_ECDH_CURVE);
        // Pass arbitrary bytes instead of encrypted data
        const invalidData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        await expect(decryptConfig(invalidData, privateKey)).rejects.toThrowError();
    });
    it("throws non-JSON error decryption", async () => {
        const { publicKey, privateKey } = await generateEncryptionKeyPair();
        const config = "This is not JSON";
        const encrypted = await encryptUInt8Array(writeString(config), publicKey);
        // Base64 decode
        const encryptedArray = new Uint8Array(encrypted);
        await expect(decryptConfig(encryptedArray, privateKey)).rejects.toThrowError();
    });
});
