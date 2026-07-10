import { decrypt, encrypt, encryptV1, obfuscatePath } from "./encryption.ts";
import { bench, describe } from "vitest";
import { decryptV3, encryptV3 } from "./encryptionv3.ts";
import {
    encrypt as encryptHkdf,
    decrypt as decryptHkdf,
    encryptBinary as encryptHkdfBinary,
    decryptBinary as decryptHkdfBinary,
    createPBKDF2Salt,
    encryptWithEphemeralSalt,
    decryptWithEphemeralSalt,
} from "./hkdf.ts";
import { obfuscatePathV2 } from "./obfuscatePathV2.ts";

// Add the encrypt function to the suite
const passphrase = "negative happy chainsaw edge";
const testData = "test data".repeat(10);
const binaryTestData = new TextEncoder().encode(testData);

const pbkdf2Salt = createPBKDF2Salt();
describe("Encryption Benchmarks", () => {
    bench(
        "encrypt",
        async () => {
            // Call the encrypt function with your test data
            await encryptV1(testData, passphrase, false);
        },
        { time: 1000 }
    );
    bench(
        "encryptV2",
        async () => {
            // Call the encrypt function with your test data
            await encrypt(testData, passphrase, false);
        },
        { time: 1000 }
    );
    // Add the encryptv3 function to the suite
    bench(
        "encryptv3",
        async () => {
            // Call the encryptv3 function with your test data
            await encryptV3(testData, passphrase);
        },
        { time: 1000 }
    );
    bench(
        "encryptHkdf",
        async () => {
            // Call the encryptHkdf function with your test data
            await encryptHkdf(testData, passphrase, pbkdf2Salt);
        },
        { time: 1000 }
    );
    bench(
        "encryptHkdfBinary",
        async () => {
            // Call the encryptHkdfBinary function with your test data
            await encryptHkdfBinary(binaryTestData, passphrase, pbkdf2Salt);
        },
        { time: 1000 }
    );
    bench(
        "encryptWithEphemeralSalt",
        async () => {
            // Call the encryptWithEphemeralSalt function with your test data
            await encryptWithEphemeralSalt(testData, passphrase);
        },
        { time: 1000 }
    );
    bench(
        "encryptWithEphemeralSalt-Refresh",
        async () => {
            // Call the encryptWithEphemeralSalt function with your test data
            await encryptWithEphemeralSalt(testData, passphrase, true);
        },
        { time: 1000 }
    );
});
describe("Decryption Benchmarks", async () => {
    const encrypted = await encryptV1(testData, passphrase, false);
    const encryptedV2 = await encrypt(testData, passphrase, false);
    const encryptedV3 = await encryptV3(testData, passphrase);
    const encryptedHkdf = await encryptHkdf(testData, passphrase, pbkdf2Salt);
    const encryptedHKDFWithSalt = await encryptWithEphemeralSalt(testData, passphrase);
    const encryptedHkdfBinary = await encryptHkdfBinary(binaryTestData, passphrase, pbkdf2Salt);
    console.log("Encrypted data:", encrypted);
    console.log("Encrypted v2 data:", encryptedV2);
    console.log("Encrypted v3 data:", encryptedV3);
    console.log("Encrypted hkdf data:", encryptedHkdf);
    console.log("Encrypted hkdf with salt data:", encryptedHKDFWithSalt);
    console.log("Encrypted data length:", encrypted.length);
    console.log("Encrypted v3 data length:", encryptedV3.length);
    console.log("Encrypted hkdf data length:", encryptedHkdf.length);
    console.log("Encrypted hkdf binary data length:", encryptedHkdfBinary.length);
    console.log("Encrypted hkdf with salt data length:", encryptedHKDFWithSalt.length);
    bench(
        "decrypt",
        async () => {
            await decrypt(encrypted, passphrase, false);
        },
        { time: 1000 }
    );
    bench(
        "decryptV2",
        async () => {
            await decrypt(encryptedV2, passphrase, false);
        },
        { time: 1000 }
    );
    bench(
        "decryptv3",
        async () => {
            await decryptV3(encryptedV3, passphrase);
        },
        { time: 1000 }
    );
    bench(
        "decryptHkdf",
        async () => {
            await decryptHkdf(encryptedHkdf, passphrase, pbkdf2Salt);
        },
        { time: 1000 }
    );
    bench(
        "decryptHkdfBinary",
        async () => {
            await decryptHkdfBinary(encryptedHkdfBinary, passphrase, pbkdf2Salt);
        },
        { time: 1000 }
    );
    bench(
        "decryptHkdfWithSalt",
        async () => {
            await decryptWithEphemeralSalt(encryptedHKDFWithSalt, passphrase);
        },
        { time: 1000 }
    );
});

describe("Encryption-Decryption Benchmarks", () => {
    bench(
        "encrypt-decrypt",
        async () => {
            const encrypted = await encryptV1(testData, passphrase, false);
            await decrypt(encrypted, passphrase, false);
        },
        { time: 1000 }
    );
    bench(
        "encrypt2-decrypt2",
        async () => {
            const encrypted = await encrypt(testData, passphrase, false);
            await decrypt(encrypted, passphrase, false);
        },
        { time: 1000 }
    );
    bench(
        "encryptv3-decryptv3",
        async () => {
            const encrypted = await encryptV3(testData, passphrase);
            await decryptV3(encrypted, passphrase);
        },
        { time: 1000 }
    );
    bench(
        "encryptHkdf-decryptHkdf",
        async () => {
            const encrypted = await encryptHkdf(testData, passphrase, pbkdf2Salt);
            await decryptHkdf(encrypted, passphrase, pbkdf2Salt);
        },
        { time: 1000 }
    );
    bench(
        "encryptHkdf-decryptHkdf-binary",
        async () => {
            const encrypted = await encryptHkdfBinary(binaryTestData, passphrase, pbkdf2Salt);
            await decryptHkdfBinary(encrypted, passphrase, pbkdf2Salt);
        },
        { time: 1000 }
    );
    bench(
        "encryptHkdfWithSalt-decryptHkdfWithSalt",
        async () => {
            const encrypted = await encryptWithEphemeralSalt(testData, passphrase);
            await decryptWithEphemeralSalt(encrypted, passphrase);
        },
        { time: 1000 }
    );
    bench(
        "encryptHkdfWithSalt-decryptHkdfWithSalt-Refresh",
        async () => {
            const encrypted = await encryptWithEphemeralSalt(testData, passphrase, true);
            await decryptWithEphemeralSalt(encrypted, passphrase);
        },
        { time: 1000 }
    );
});

describe("obfuscatePathV2 Benchmarks", () => {
    const path = "my/path.txt";
    const passphrase = "passphrase";
    const salt = createPBKDF2Salt();

    bench(
        "obfuscatePathV2",
        async () => {
            await obfuscatePathV2(path, passphrase, salt);
        },
        { time: 1000 }
    );
    bench(
        "previous obfuscatePath",
        async () => {
            await obfuscatePath(path, passphrase, false);
        },
        { time: 1000 }
    );
});
