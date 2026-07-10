import { describe, expect, test, vi } from "vitest";
import {
    decrypt,
    decryptBinary,
    encrypt,
    encryptBinary,
    encryptV1,
    isPathProbablyObfuscated,
    obfuscatePath,
    testCrypt,
    tryDecrypt,
} from "./encryption.ts";
import { hexStringToUint8Array } from "../binary/index.ts";
import { encryptV3 } from "./encryptionv3.ts";

test("should return true if encryption and decryption are successful", async () => {
    const result = await testCrypt();
    expect(result).toBe(true);
});
test("should decrypt the encrypted binary data", async () => {
    const encryptedResult = new Uint8Array(
        hexStringToUint8Array(
            "97a758f443205da20f6c83cb03000000281c5879b5a6494de97645fb21ddbb425e9f76404a6972d2caf00d1efece47a838843d7a69"
        )
    );
    const passphrase = "passwordTest";
    const autoCalculateIterations = false;

    const decryptedResult = await decryptBinary(encryptedResult, passphrase, autoCalculateIterations);

    expect(decryptedResult).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
});
test("should encrypt binary data using AES-GCM encryption algorithm", async () => {
    const input = new Uint8Array([1, 2, 3, 4, 5]);
    const passphrase = "passwordTest";
    const autoCalculateIterations = false;

    const encryptedResult = await encryptBinary(input, passphrase, autoCalculateIterations);
    const decryptedResult = await decryptBinary(encryptedResult, passphrase, autoCalculateIterations);

    expect(decryptedResult).toEqual(new Uint8Array([1, 2, 3, 4, 5])); // Replace with the expected encrypted result
});
test("should decrypt binary fails with the wrong passphrase", async () => {
    const input = new Uint8Array([1, 2, 3, 4, 5]);
    const passphrase = "passwordTest";
    const wrongPassphrase = "wrongPassword";
    const autoCalculateIterations = false;

    const encryptedResult = await encryptBinary(input, passphrase, autoCalculateIterations);
    await expect(decryptBinary(encryptedResult, wrongPassphrase, autoCalculateIterations)).rejects.toThrowError();
});

test("should encrypted string should be unique", async () => {
    for (let i = 0; i < 10000; i++) {
        const input = new Uint8Array([1, 2, 3, 4, 5]);
        const set = new Set();
        const passphrase = "passwordTest";
        const autoCalculateIterations = false;

        const encryptedResult = await encryptBinary(input, passphrase, autoCalculateIterations);
        expect(set.has(encryptedResult)).toBe(false);
        set.add(encryptedResult);
        const decryptedResult = await decryptBinary(encryptedResult, passphrase, autoCalculateIterations);

        expect(decryptedResult).toEqual(new Uint8Array([1, 2, 3, 4, 5])); // Replace with the expected encrypted result
    }
});

test("should return true if encryption and decryption are successful", async () => {
    const result = await testCrypt();
    expect(result).toBe(true);
});

test("should return true the test crypt", async () => {
    const result = await testCrypt();
    expect(result).toBe(true);

    // Restore the original console.log implementation
    vi.restoreAllMocks();
});

test("should return decrypted result if decryption is successful", async () => {
    const encryptedResult = "encryptedData";
    const passphrase = "passwordTest";
    const autoCalculateIterations = false;

    const decryptedResult = await tryDecrypt(encryptedResult, passphrase, autoCalculateIterations);

    expect(decryptedResult).toBe(false);
});

test("should return false if decryption fails", async () => {
    const encryptedResult = "encryptedData";
    const passphrase = false;
    const autoCalculateIterations = false;

    const decryptedResult = await tryDecrypt(encryptedResult, passphrase, autoCalculateIterations);

    expect(decryptedResult).toBe(false);
});

test("should decrypt the encrypted result and return the decrypted string", async () => {
    const encryptedResult =
        "%ae62aa26d34338a54d41d40601000000e05454c7b864c044ccc5b8c769d8e950L6f25sLek+g+C+1eKHgLrlffdrr0ABFC6B6g7uI=";
    const passphrase = "passwordTest";
    const autoCalculateIterations = false;
    const decryptedResult = await decrypt(encryptedResult, passphrase, autoCalculateIterations);
    expect(decryptedResult).toBe("encryptedData");
});

test("should throw an error if the encrypted data is corrupted", async () => {
    const encryptedResult = "corruptedData";
    const passphrase = "passwordTest";
    const autoCalculateIterations = false;

    await expect(decrypt(encryptedResult, passphrase, autoCalculateIterations)).rejects.toThrowError(
        "Encrypted data corrupted!"
    );
});

test("should throw an error if decryption fails", async () => {
    const encryptedResult = "encryptedData";
    const passphrase = "wrongPassword";
    const autoCalculateIterations = false;

    await expect(decrypt(encryptedResult, passphrase, autoCalculateIterations)).rejects.toThrowError();
});

test("should obfuscate the path", async () => {
    const path = "/path/to/obfuscate";
    const passphrase = "passwordTest";
    const autoCalculateIterations = false;

    const obfuscatedPath = await obfuscatePath(path, passphrase, autoCalculateIterations);

    expect(obfuscatedPath).toMatch(/^%([0-9a-fA-F]{32})([0-9a-fA-F]{32}).*$/);
    expect(obfuscatedPath).not.toBe(path);
    expect(obfuscatedPath).toBe(
        "%931636970d4bc03e843d02f0d7f6cc4cdcdcf2a062af7b8c259e3af73edb64c8v7zdTqKnYzWgW6+ry1dHkPT8aMQJtIg2WwNu3aKXalrIow=="
    );

    const decodedPath = await decrypt(obfuscatedPath, passphrase, autoCalculateIterations);
    expect(decodedPath).toBe(path);
});

test("should obfuscate path fails with wrong passphrase", async () => {
    const path = "/path/to/obfuscate";
    const passphrase = "passwordTest";
    const wrongPassphrase = "wrongPassword";
    const autoCalculateIterations = false;

    const obfuscatedPath = await obfuscatePath(path, passphrase, autoCalculateIterations);

    expect(obfuscatedPath).toMatch(/^%([0-9a-fA-F]{32})([0-9a-fA-F]{32}).*$/);
    expect(obfuscatedPath).not.toBe(path);
    expect(obfuscatedPath).toBe(
        "%931636970d4bc03e843d02f0d7f6cc4cdcdcf2a062af7b8c259e3af73edb64c8v7zdTqKnYzWgW6+ry1dHkPT8aMQJtIg2WwNu3aKXalrIow=="
    );
    await expect(decrypt(obfuscatedPath, wrongPassphrase, autoCalculateIterations)).rejects.toThrowError();
});

test("should encrypt the input string using AES-GCM encryption algorithm", async () => {
    const input = "Hello, World!";
    const passphrase = "passwordTest";
    const autoCalculateIterations = false;

    const encryptedResult = await encrypt(input, passphrase, autoCalculateIterations);

    expect(encryptedResult).toMatch(/^%([0-9a-fA-F]{32})([0-9a-fA-F]{32}).*$/);
    const decryptedResult = await decrypt(encryptedResult, passphrase, autoCalculateIterations);
    expect(decryptedResult).toBe(input);
});

test("should encrypt an empty string", async () => {
    const input = "";
    const passphrase = "passwordTest";
    const autoCalculateIterations = false;

    const encryptedResult = await encrypt(input, passphrase, autoCalculateIterations);

    expect(encryptedResult).toMatch(/^%([0-9a-fA-F]{32})([0-9a-fA-F]{32}).*$/);
    const decryptedResult = await decrypt(encryptedResult, passphrase, autoCalculateIterations);
    expect(decryptedResult).toBe(input);
});

test("should encrypt a string with special characters", async () => {
    const input = "!@#$%^&*()";
    const passphrase = "passwordTest";
    const autoCalculateIterations = false;

    const encryptedResult = await encrypt(input, passphrase, autoCalculateIterations);

    expect(encryptedResult).toMatch(/^%([0-9a-fA-F]{32})([0-9a-fA-F]{32}).*$/);
    const decryptedResult = await decrypt(encryptedResult, passphrase, autoCalculateIterations);
    expect(decryptedResult).toBe(input);
});
test("should encrypt the input string using AES-GCM encryption algorithm", async () => {
    const input = "Hello, World!";
    const passphrase = "passwordTest";
    const autoCalculateIterations = false;

    const encryptedResult = await encryptV1(input, passphrase, autoCalculateIterations);

    expect(encryptedResult).toMatch(/^\["[A-Za-z0-9+/=]+","[0-9a-fA-F]{32}","[0-9a-fA-F]{32}"\]$/);
    const decryptedResult = await decrypt(encryptedResult, passphrase, autoCalculateIterations);
    expect(decryptedResult).toBe(input);
});

test("should encrypted values are different if the input strings are the same.", async () => {
    const input = "Hello, World!";
    const passphrase = "passwordTest";
    const autoCalculateIterations = false;

    const encryptedResult1 = await encrypt(input, passphrase, autoCalculateIterations);
    const encryptedResult2 = await encrypt(input, passphrase, autoCalculateIterations);

    expect(encryptedResult1).toMatch(/^%([0-9a-fA-F]{32})([0-9a-fA-F]{32}).*$/);
    const decryptedResult1 = await decrypt(encryptedResult1, passphrase, autoCalculateIterations);
    expect(decryptedResult1).toBe(input);

    expect(encryptedResult2).toMatch(/^%([0-9a-fA-F]{32})([0-9a-fA-F]{32}).*$/);
    const decryptedResult2 = await decrypt(encryptedResult2, passphrase, autoCalculateIterations);
    expect(decryptedResult2).toBe(input);

    expect(encryptedResult1).not.toBe(encryptedResult2);
});

test("should results which auto calculation enabled and disabled are different", async () => {
    const input = "Hello, World!";
    const passphrase = "passwordTestあaあああ";
    const encryptedResult1 = await encrypt(input, passphrase, true);
    const encryptedResult2 = await encrypt(input, passphrase, false);
    expect(encryptedResult1).not.toBe(encryptedResult2);
});

test("should results which auto calculation enabled and disabled are different on obfuscatePath", async () => {
    const path = "/path/to/obfuscate";
    const passphraseSrc = "passwordTestあaあああ";
    for (let i = 0; i < 100; i++) {
        const passphrase = passphraseSrc.repeat(i);
        const encryptedResult1 = await obfuscatePath(path, passphrase, true);
        const encryptedResult2 = await obfuscatePath(path, passphrase, false);
        expect(encryptedResult1).not.toBe(encryptedResult2);
    }
});

test("should auto calculation works", async () => {
    const input = "Hello, World!";
    const passphrase = "passwordTestあaあああ";
    const autoCalculateIterations = true;

    for (let i = 0; i < 100; i++) {
        const inputString = input.repeat(i);
        const passphraseString = passphrase.repeat(i);
        const encryptedResult1 = await encrypt(inputString, passphraseString, autoCalculateIterations);
        const decryptedResult1 = await decrypt(encryptedResult1, passphraseString, autoCalculateIterations);
        expect(decryptedResult1).toBe(inputString);
    }
});
test("should return true if the path is probably obfuscated", () => {
    const path =
        "%931636970d4bc03e843d02f0d7f6cc4cdcdcf2a062af7b8c259e3af73edb64c8v7zdTqKnYzWgW6+ry1dHkPT8aMQJtIg2WwNu3aKXalrIow==";

    const result = isPathProbablyObfuscated(path);

    expect(result).toBe(true);
});

test("should return false if the path is not obfuscated", () => {
    const path = "/path/to/file.txt";

    const result = isPathProbablyObfuscated(path);

    expect(result).toBe(false);
});

test("should return true if the path is probably obfuscated by actually obfuscated path", async () => {
    const path = await obfuscatePath("test.md", "passwordTest", false);

    const result = isPathProbablyObfuscated(path);

    expect(result).toBe(true);
});

describe("v3", () => {
    test("should be able to decrypt v3 style encrypted data", async () => {
        const encrypted = "%~ddd35704b824765901296a21xi/lryj6A5QY+c/NkPSROop1p/POZ5EBQYRLkoGSHQ==";
        const passphrase = "password";
        const decrypted = await decrypt(encrypted, passphrase, false);
        expect(decrypted).toBe("fancy-syncying!");
    });
    test("should be different results for same passphrase and input", async () => {
        const result = new Set();
        const passphrase = "password";
        const input = "fancy-syncying!";
        for (let i = 0; i < 100; i++) {
            const encrypted = await encryptV3(input, passphrase);
            expect(result.has(encrypted)).toBe(false);
            result.add(encrypted);
        }
    });
});
