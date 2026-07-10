import { mixedHash, epochFNV1a, fallbackMixedHashEach, fallbackMixedHash, sha1Hash } from "./purejs.ts";
import { describe, it, expect } from "vitest";
import { sha1 } from "./purejs.ts";

describe("mixedHash", () => {
    it("should return correct hash for an empty string", () => {
        const [murmurHash, fnv1aHash] = mixedHash("", 0);
        expect(murmurHash).toBe(0);
        expect(fnv1aHash).toBe(epochFNV1a);
    });

    it("should return correct hash for a simple string", () => {
        const [murmurHash, fnv1aHash] = mixedHash("test", 0);
        expect(murmurHash).toBe(2872016746);
        expect(fnv1aHash).toBe(2949673445);
    });

    it("should return different hashes for different strings", () => {
        const [murmurHash1, fnv1aHash1] = mixedHash("test1", 0);
        const [murmurHash2, fnv1aHash2] = mixedHash("test2", 0);
        expect(murmurHash1).not.toBe(murmurHash2);
        expect(fnv1aHash1).not.toBe(fnv1aHash2);
    });
    it("can be updated by a string", () => {
        let [murmurHash, fnv1aHash] = mixedHash("hello", 0);
        const [murmurHash2, fnv1aHash2] = mixedHash("world", murmurHash, fnv1aHash);
        expect(fnv1aHash).not.toBe(fnv1aHash2);
        expect(murmurHash).not.toBe(murmurHash2);
    });
});
describe("fallbackMixedHashEach", () => {
    it("should return correct hash for an empty string", () => {
        const hash = fallbackMixedHashEach("");
        expect(hash).toBe("hydjuoepw9f3");
    });

    it("should return correct hash for a simple string", () => {
        const hash = fallbackMixedHashEach("test");
        expect(hash).toBe("otdts71uuv60n");
    });

    it("should return correct hash for a long string", () => {
        const longString = "a".repeat(1024);
        const hash = fallbackMixedHashEach(longString);
        expect(hash).toBe("1sdtykx1v6ig5e");
    });

    it("should return different hashes for different strings", () => {
        const hash1 = fallbackMixedHashEach("test1");
        const hash2 = fallbackMixedHashEach("test2");
        expect(hash1).not.toBe(hash2);
    });

    it("should return correct hash for a string with special characters", () => {
        const hash = fallbackMixedHashEach("!@#$%^&*()");
        expect(hash).toBe("1g54ftwtj34vu");
    });
    it("should accept non-ascii characters", () => {
        const zhHash = fallbackMixedHashEach(
            "国破山河在，城春草木深。感时花溅泪，恨别鸟惊心。峰火连三月，家书抵万金。白头搔更短，浑欲不胜簪。"
        );
        expect(zhHash).toBe("ond0d2zixqea");
        const jpHash = fallbackMixedHashEach("デュワ～♪");
        expect(jpHash).toBe("f0hq8y1wdgg8p");
        const emojis = fallbackMixedHashEach("🥤😀✨");
        expect(emojis).toBe("1dvs8tpl4c23p");
        const cyrillicHash = fallbackMixedHashEach("Доброе слово и кошке приятно.");
        expect(cyrillicHash).toBe("1ybsshp1c3i1s");

        const binarySource = `\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007\b\t\n\v\f\r\u000e\u000f`;
        const reversedBinarySource = binarySource.split("").reverse().join("");
        const binaryHash = fallbackMixedHashEach(binarySource);
        const binaryHash2 = fallbackMixedHashEach(reversedBinarySource);
        expect(binaryHash).toBe("k9ynpvn8reny");
        expect(binaryHash2).toBe("kj0tgt1nxt4da");
        expect(binaryHash2).not.toBe(binaryHash);
    });
});

describe("fallbackMixedHash", () => {
    it("should return correct hash for an empty array", () => {
        const hash = fallbackMixedHash([]);
        expect(hash).toBe("14rna9q1b7mxfp");
    });

    it("should return correct hash for an array with one string", () => {
        const hash = fallbackMixedHash(["test"]);
        expect(hash).toBe("1mma87r1uuv60n");
    });

    it("should return correct hash for an array with multiple strings", () => {
        const hash = fallbackMixedHash(["test1", "test2"]);
        expect(hash).toBe("194yprvttas8r");
    });

    it("should return different hashes for different arrays", () => {
        const hash1 = fallbackMixedHash(["test1"]);
        const hash2 = fallbackMixedHash(["test2"]);
        expect(hash1).not.toBe(hash2);
    });

    it("should return correct hash for an array with special characters", () => {
        const hash = fallbackMixedHash(["!@#$%^&*()"]);
        expect(hash).toBe("1kw5r52tj34vu");
    });

    it("should return correct hash for a long array", () => {
        const longArray = Array(1024).fill("a");
        const hash = fallbackMixedHash(longArray);
        expect(hash).toBe("khztl41ltn0gs");
    });
});

describe("sha1", () => {
    it("should return correct SHA-1 hash for an empty string", async () => {
        const hash = await sha1("");
        expect(hash).toBe("2jmj7l5rSw0yVb/vlWAYkK/YBwk=");
    });

    it("should return correct SHA-1 hash for a simple string", async () => {
        const hash = await sha1("test");
        expect(hash).toBe("qUqP5cyxm6YcTAhz05Hph5gvu9M=");
    });

    it("should return correct SHA-1 hash for a long string", async () => {
        const longString = "a".repeat(1024);
        const hash = await sha1(longString);
        expect(hash).toBe("jspVRjHfnq0UUQ4acK5Ixw+bk4Q=");
    });

    it("should return different SHA-1 hashes for different strings", async () => {
        const hash1 = await sha1("test1");
        const hash2 = await sha1("test2");
        expect(hash1).not.toBe(hash2);
    });

    it("should return correct SHA-1 hash for a string with special characters", async () => {
        const hash = await sha1("!@#$%^&*()");
        expect(hash).toBe("vyTWXJuwW5uBSpZpQLz6UHZ8io0=");
    });
});

describe("sha1Hash", () => {
    it("should return correct SHA-1 hash for an empty string", async () => {
        const hash = await sha1Hash("");
        expect(hash).toBe("da39a3ee5e6b4b0d3255bfef95601890afd80709");
    });

    it("should return correct SHA-1 hash for a simple string", async () => {
        const hash = await sha1Hash("test");
        expect(hash).toBe("a94a8fe5ccb19ba61c4c0873d391e987982fbbd3");
    });

    it("should return correct SHA-1 hash for a long string", async () => {
        const longString = "a".repeat(1024);
        const hash = await sha1Hash(longString);
        expect(hash).toBe("8eca554631df9ead14510e1a70ae48c70f9b9384");
    });

    it("should return different SHA-1 hashes for different strings", async () => {
        const hash1 = await sha1Hash("test1");
        const hash2 = await sha1Hash("test2");
        expect(hash1).not.toBe(hash2);
    });

    it("should return correct SHA-1 hash for a string with special characters", async () => {
        const hash = await sha1Hash("!@#$%^&*()");
        expect(hash).toBe("bf24d65c9bb05b9b814a966940bcfa50767c8a8d");
    });
});
