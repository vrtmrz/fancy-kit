import { describe, it, expect } from "vitest";
import { encryptCBC, decryptCBC } from "./CBC.ts";

function strToUint8(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}
function uint8ToStr(arr: Uint8Array): string {
    return new TextDecoder().decode(arr);
}

describe("encryptCBC / decryptCBC", () => {
    const password = "cbc-test-password";
    const plaintext = "これはCBCテストです。Hello, CBC! 5678";
    const iterations = 100_002;

    it("Restores the original text after encryption and decryption", async () => {
        const plainBytes = strToUint8(plaintext);
        const encrypted = await encryptCBC(plainBytes, password, iterations);
        expect(encrypted).toBeInstanceOf(Uint8Array);
        expect(encrypted.length).toBeGreaterThan(plainBytes.length);

        const decrypted = await decryptCBC(encrypted, password, iterations);
        expect(uint8ToStr(decrypted)).toBe(plaintext);
    });

    it("Throws a decryption error when the password is incorrect", async () => {
        const plainBytes = strToUint8(plaintext);
        const encrypted = await encryptCBC(plainBytes, password, iterations);

        await expect(decryptCBC(encrypted, "wrong-password", iterations)).rejects.toThrow();
    });

    it("Throws a decryption error when the data is corrupted", async () => {
        const plainBytes = strToUint8(plaintext);
        const encrypted = await encryptCBC(plainBytes, password, iterations);
        // Corrupt a single byte
        encrypted[encrypted.length - 1] ^= 0xff;

        await expect(decryptCBC(encrypted, password, iterations)).rejects.toThrow();
    });

    it("Throws an error when the data is too short", async () => {
        const tooShort = new Uint8Array(5);
        await expect(decryptCBC(tooShort, password, iterations)).rejects.toThrow(/too short/);
    });

    it("Throws an error when the Salted__ prefix is invalid", async () => {
        const plainBytes = strToUint8(plaintext);
        const encrypted = await encryptCBC(plainBytes, password, iterations);
        // Break the prefix
        encrypted[0] = 0x00;
        await expect(decryptCBC(encrypted, password, iterations)).rejects.toThrow(/Invalid encrypted data format/);
    });
});
