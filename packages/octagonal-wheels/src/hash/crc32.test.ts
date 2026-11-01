import { describe, expect, it } from "vitest";
import { crc32CHash, crc32CKHash } from "./crc32.ts";

describe("legacy CRC-derived hash compatibility", () => {
    it.each([
        { input: "", c: "-i93f7", ck: "-i93f7--ekj2u5" },
        { input: "日本語😀", c: "-dqsqid", ck: "-dqsqid--3kp69c" },
    ])("retains the existing output for $input", ({ input, c, ck }) => {
        expect(crc32CHash(input)).toBe(c);
        expect(crc32CKHash(input)).toBe(ck);
    });
});
