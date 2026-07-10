import { writeString, arrayBufferToBase64Single } from '../binary/base64.js';
import '../binary/encodedUTF16.js';
import '../binary/hex.js';

// Pure JS implementation of hash functions for fallback purposes.
// Constants for FNV-1a hash algorithm
const epochFNV1a = 2166136261 >>> 0;
// Constants for murmurHash3 algorithm
const c1 = 0xcc9e2d51;
const c2 = 0x1b873593;
const r1 = 15;
const r2 = 13;
const m = 5;
const n = 0xe6546b64;
/**
 * Computes a mixed hash of a given string using MurmurHash3 and FNV-1a hash algorithms.
 * The MurmurHash3 is used as the primary hash, while the FNV-1a hash is used as a secondary hash.
 * This function is fallback for the xxhash.
 *
 * @param str - The input string to hash.
 * @param seed - The seed value for the MurmurHash3 algorithm.
 * @param fnv1aHash_ - The initial value for the FNV-1a hash algorithm. Defaults to `epochFNV1a`.
 * @returns A tuple containing the resulting MurmurHash3 hash and FNV-1a hash. fnv-1a hash should be used as a supplementary hash.
 */
function mixedHash(str, seed, fnv1aHash_ = epochFNV1a) {
    let h1 = seed;
    let fnv1aHash = fnv1aHash_;
    const len = str.length;
    for (let i = 0; i < len; i++) {
        let k1 = str.charCodeAt(i);
        // FNV-1a hash (avoiding negative values)
        fnv1aHash ^= k1;
        fnv1aHash = Math.imul(fnv1aHash, 0x01000193) >>> 0;
        // MurmurHash3 inner loop (adapted for per-byte-ish processing)
        k1 *= c1;
        k1 = (k1 << r1) | (k1 >>> (32 - r1));
        k1 *= c2;
        h1 ^= k1;
        h1 = (h1 << r2) | (h1 >>> (32 - r2));
        h1 = h1 * m + n;
    }
    h1 ^= len;
    h1 ^= h1 >>> 16;
    h1 = Math.imul(h1, 0x85ebca6b);
    h1 ^= h1 >>> 13;
    h1 = Math.imul(h1, 0xc2b2ae35);
    h1 ^= h1 >>> 16;
    return [h1 >>> 0, fnv1aHash];
}
function fallbackMixedHashEach(src) {
    let m = 1;
    let f = epochFNV1a;
    [m, f] = mixedHash(`${src.length}${src}`, m, f);
    // To obfuscate how the hash is generated, express it in radix 36 and concatenate them.
    // Using 36 based number makes the hash shorter, and potentially leads to a more even distribution of characters in the hash.
    // This is not a secure hash, but it's good enough for our purposes.
    return `${m.toString(36)}${f.toString(36)}`;
}
/**
 * Computes a mixed hash from an array of strings using Murmur3 and FNV-1a hash algorithms.
 *
 * @param src - An array of strings to be hashed.
 * @returns A string representing the mixed hash value in base-36 format.
 */
function fallbackMixedHash(src) {
    if (src == null || src.length == 0)
        return fallbackMixedHashEach("**");
    let m = 1;
    let f = epochFNV1a;
    [m, f] = mixedHash(src[0].length + "", m, f);
    for (const v of src) {
        [m, f] = mixedHash(v, m, f);
    }
    // To obfuscate how the hash is generated, express it in radix 36 and concatenate them.
    // Using 36 based number makes the hash shorter, and potentially leads to a more even distribution of characters in the hash.
    // This is not a secure hash, but it's good enough for our purposes.
    return `${m.toString(36)}${f.toString(36)}`;
}
/**
 * Calculates the base-64 encoded SHA-1 hash of the given string.
 * Note: Very slow, use only when necessary. Prefer fallbackMixedHashEach for faster hashing.
 *
 * @param src - The string to calculate the hash for.
 * @returns A promise that resolves to the SHA-1 hash as a base64-encoded string.
 */
async function sha1(src) {
    const bytes = writeString(src);
    const digest = await globalThis.crypto.subtle.digest({ name: "SHA-1" }, bytes);
    return await arrayBufferToBase64Single(digest);
}
const te = new TextEncoder();
/**
 * Calculates the hex encoded SHA-1 hash of the given string.
 * Note: Very slow, use only when necessary. Prefer fallbackMixedHashEach for faster hashing.
 *
 * @param str - The string to calculate the hash for.
 * @returns A promise that resolves to the SHA-1 hash as a hex-encoded string.
 */
async function sha1Hash(str) {
    const buffer = te.encode(str);
    const hashBuffer = await globalThis.crypto.subtle.digest("SHA-1", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hexHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hexHash;
}

export { epochFNV1a, fallbackMixedHash, fallbackMixedHashEach, mixedHash, sha1, sha1Hash };
//# sourceMappingURL=purejs.js.map
