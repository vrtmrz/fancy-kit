//@ts-ignore
import { default as xxhashNew } from "../patched_xxhash_wasm/xxhash-wasm.js";
import type { XXHashAPI } from "xxhash-wasm-102";
import { Logger, LOG_LEVEL_VERBOSE } from "../common/logger.ts";
import { fallbackMixedHashEach } from "./purejs.ts";

export { xxhashNew };

// Default hash function (Initialised to fallback once).
// This will be updated to xxhash once it is initialised (on initHashFunc).
let hashFunc: (input: string, seed?: number) => string = (str) => fallbackMixedHashEach(str);

async function initHashFunc() {
    try {
        const { h32ToString } = await (xxhashNew as unknown as () => Promise<XXHashAPI>)();
        hashFunc = h32ToString;
        Logger(`xxhash for plugin initialised`, LOG_LEVEL_VERBOSE);
    } catch (ex) {
        Logger(`Could not initialise xxhash. fallback...`, LOG_LEVEL_VERBOSE);
        Logger(ex);
        hashFunc = (str) => fallbackMixedHashEach(str);
    }
    return hashFunc;
}

// And, here to initialise the hash function
void initHashFunc();

/**
 * Calculates the digest hash of an array of strings using prepared hash function.
 *
 * @param src - The array of strings to calculate the hash for.
 * @returns The digest hash of the input array.
 */
export function digestHash(src: string[]): string {
    let hash = "";
    for (const v of src) {
        hash = hashFunc(hash + v);
    }
    if (hash == "") {
        return hashFunc("**");
    }
    return hash;
}
