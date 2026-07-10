import e from '../patched_xxhash_wasm/xxhash-wasm.js';
import { Logger, LOG_LEVEL_VERBOSE } from '../common/logger.js';
import { fallbackMixedHashEach } from './purejs.js';

//@ts-ignore
// Default hash function (Initialised to fallback once).
// This will be updated to xxhash once it is initialised (on initHashFunc).
let hashFunc = (str) => fallbackMixedHashEach(str);
async function initHashFunc() {
    try {
        const { h32ToString } = await e();
        hashFunc = h32ToString;
        Logger(`xxhash for plugin initialised`, LOG_LEVEL_VERBOSE);
    }
    catch (ex) {
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
function digestHash(src) {
    let hash = "";
    for (const v of src) {
        hash = hashFunc(hash + v);
    }
    if (hash == "") {
        return hashFunc("**");
    }
    return hash;
}

export { digestHash, e as xxhashNew };
//# sourceMappingURL=xxhash.js.map
