export declare const epochFNV1a: number;
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
export declare function mixedHash(str: string, seed: number, fnv1aHash_?: number): [number, number];
export declare function fallbackMixedHashEach(src: string): string;
/**
 * Computes a mixed hash from an array of strings using Murmur3 and FNV-1a hash algorithms.
 *
 * @param src - An array of strings to be hashed.
 * @returns A string representing the mixed hash value in base-36 format.
 */
export declare function fallbackMixedHash(src: string[]): string;
/**
 * Calculates the base-64 encoded SHA-1 hash of the given string.
 * Note: Very slow, use only when necessary. Prefer fallbackMixedHashEach for faster hashing.
 *
 * @param src - The string to calculate the hash for.
 * @returns A promise that resolves to the SHA-1 hash as a base64-encoded string.
 */
export declare function sha1(src: string): Promise<string>;
/**
 * Calculates the hex encoded SHA-1 hash of the given string.
 * Note: Very slow, use only when necessary. Prefer fallbackMixedHashEach for faster hashing.
 *
 * @param str - The string to calculate the hash for.
 * @returns A promise that resolves to the SHA-1 hash as a hex-encoded string.
 */
export declare function sha1Hash(str: string): Promise<string>;
