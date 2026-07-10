import { default as xxhashNew } from "../patched_xxhash_wasm/xxhash-wasm.js";
export { xxhashNew };
/**
 * Calculates the digest hash of an array of strings using prepared hash function.
 *
 * @param src - The array of strings to calculate the hash for.
 * @returns The digest hash of the input array.
 */
export declare function digestHash(src: string[]): string;
