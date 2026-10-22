import { describe, it, expect } from "vitest";
import { encryptCBC, decryptCBC } from "./CBC.ts";

function strToUint8(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}
function uint8ToStr(arr: Uint8Array): string {
    return new TextDecoder().decode(arr);
}
function decodeFixture(encoded: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
}

describe("encryptCBC / decryptCBC", () => {
    const password = "cbc-test-password";
    const plaintext = "これはCBCテストです。Hello, CBC! 5678";
    const iterations = 100_002;
    // Generated with Node.js crypto: PBKDF2-SHA-256 and AES-256-CBC, using the
    // original plaintext, password, and iterations above. The eight-byte salts
    // are 0000000000000000, 00000000000001a4, and 0000000000000061 respectively.
    const invalidWrongPasswordPaddingFixture =
        "U2FsdGVkX18AAAAAAAAAAPXsHsjLFkPqNpttLrBGN3+7l6U8gcKOVtPronl91Yd/NdhtzLDz/PDQxLcCmwxZOQ==";
    const validWrongPasswordPaddingFixture =
        "U2FsdGVkX18AAAAAAAABpO9hIPzufZU72ThVZ94pJ0teV0uMf6G/8HI/XujuDPaGt3PYFWweOkADOWXCyEtamQ==";
    const validCorruptedPaddingFixture =
        "U2FsdGVkX18AAAAAAAAAYdHWmhkTbVh1uKRcbv1wkAb0zwoNmR+qHGClMP/Ng/XEPftVhd2tqKDNjTLZJ3g7pg==";

    it("Restores the original text after encryption and decryption", async () => {
        const plainBytes = strToUint8(plaintext);
        const encrypted = await encryptCBC(plainBytes, password, iterations);
        expect(encrypted).toBeInstanceOf(Uint8Array);
        expect(encrypted.length).toBeGreaterThan(plainBytes.length);

        const decrypted = await decryptCBC(encrypted, password, iterations);
        expect(uint8ToStr(decrypted)).toBe(plaintext);
    });

    it("Rejects a wrong-password fixture with invalid padding", async () => {
        const encrypted = decodeFixture(invalidWrongPasswordPaddingFixture);
        expect(await decryptCBC(encrypted, password, iterations)).toEqual(strToUint8(plaintext));

        await expect(decryptCBC(encrypted, "wrong-password", iterations)).rejects.toMatchObject({
            name: "OperationError",
        });
    });

    it("Returns unauthenticated bytes for a wrong password with valid padding", async () => {
        const encrypted = decodeFixture(validWrongPasswordPaddingFixture);
        expect(await decryptCBC(encrypted, password, iterations)).toEqual(strToUint8(plaintext));

        const decrypted = await decryptCBC(encrypted, "wrong-password", iterations);
        expect(decrypted).toEqual(decodeFixture("96SL3+sgbnoIUHstV3glPY0lqCAAFayzlBOZa81q0cbb/FtKE0DtHwCSdntvPV8="));
        expect(decrypted).not.toEqual(strToUint8(plaintext));
    });

    it("Rejects ciphertext with deliberately invalid padding", async () => {
        const encrypted = decodeFixture(invalidWrongPasswordPaddingFixture);
        expect(await decryptCBC(encrypted, password, iterations)).toEqual(strToUint8(plaintext));
        // Changing the previous block's last byte XORs the final padding length
        // with 0xff, making every valid padding length (1-16) invalid.
        encrypted[encrypted.length - 17] ^= 0xff;

        await expect(decryptCBC(encrypted, password, iterations)).rejects.toMatchObject({
            name: "OperationError",
        });
    });

    it("Returns modified bytes when ciphertext corruption leaves valid padding", async () => {
        const encrypted = decodeFixture(validCorruptedPaddingFixture);
        expect(await decryptCBC(encrypted, password, iterations)).toEqual(strToUint8(plaintext));
        // Preserve the original last-byte corruption scenario with a fixed salt.
        encrypted[encrypted.length - 1] ^= 0xff;

        const decrypted = await decryptCBC(encrypted, password, iterations);
        expect(decrypted).toEqual(decodeFixture("44GT44KM44GvQ0JD44OG44K544OI44Gn44GZ44CCSGWX1hQIQg56aFMSnwlOGVQ="));
        expect(decrypted).not.toEqual(strToUint8(plaintext));
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
