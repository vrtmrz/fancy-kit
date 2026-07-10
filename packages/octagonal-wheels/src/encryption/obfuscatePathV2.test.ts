import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { isPathProbablyObfuscatedV2, obfuscatePathV2 } from "./obfuscatePathV2.ts";
import { createPBKDF2Salt } from "./hkdf.ts";

describe("isPathProbablyObfuscatedV2", () => {
    it("returns true for obfuscated path", () => {
        expect(isPathProbablyObfuscatedV2("%/\\abcdef")).toBe(true);
    });
    it("returns false for normal path", () => {
        expect(isPathProbablyObfuscatedV2("folder/file.txt")).toBe(false);
    });
});

describe("obfuscatePathV2", () => {
    it("returns obfuscated path for normal input", async () => {
        const salt = createPBKDF2Salt();
        const result = await obfuscatePathV2("my/path.txt", "pass", salt);
        console.log("Obfuscated path:", result);
        expect(result.startsWith("%/\\")).toBe(true);
        expect(result.length).toBeGreaterThan("%/\\".length);
    });
    it("obfuscate path with the same passphrase and salt returns the same result", async () => {
        const passphrase = "test-passphrase";
        const salt = createPBKDF2Salt();
        const result1 = await obfuscatePathV2("my/path.txt", passphrase, salt);
        const result2 = await obfuscatePathV2("my/path.txt", passphrase, salt);
        expect(result1).toBe(result2);
    });
    it("returns input as-is if already obfuscated", async () => {
        const input = "%/\\alreadyobfuscated";
        const salt = createPBKDF2Salt();
        const result = await obfuscatePathV2(input, "pass", salt);
        expect(result).toBe(input);
    });

    it("different passphrases produce different results", async () => {
        const salt = createPBKDF2Salt();
        const result1 = await obfuscatePathV2("my/path.txt", "pass1", salt);
        const result2 = await obfuscatePathV2("my/path.txt", "pass2", salt);
        expect(result1).not.toBe(result2);
    });
    it("different salts produce different results", async () => {
        const passphrase = "test-passphrase";
        const salt1 = createPBKDF2Salt();
        const salt2 = createPBKDF2Salt();
        const result1 = await obfuscatePathV2("my/path.txt", passphrase, salt1);
        const result2 = await obfuscatePathV2("my/path.txt", passphrase, salt2);
        expect(result1).not.toBe(result2);
    });
});
