import { VolatileValueCache } from './VolatileValueCache.js';

function getStringifiedKey(key) {
    if (key === undefined)
        return "undefined";
    if (typeof key === "string" || typeof key === "number")
        return String(key);
    return JSON.stringify(key);
}
/**
 * Creates a weakly memoized version of an asynchronous function.
 * @param fn The asynchronous function to memoize.
 * @param keyFunction An optional function to generate a cache key from the function arguments.
 * @returns A new function that memoizes the results of the original function.
 */
function weakMemo(fn, keyFunction) {
    const cache = new VolatileValueCache();
    // Helper to generate a key from all arguments
    const getKey = (args) => {
        return args.length == 0 ? "" : args.map((e) => getStringifiedKey(e)).join("-");
    };
    const keyFunc = keyFunction || getKey;
    return function (...args) {
        const key = keyFunc(args);
        // --- Cache Hit ---
        // Performance improvement: O(1) lookup
        const cached = cache.get(key);
        if (cached) {
            return cached;
        }
        // --- Cache Miss ---
        // Call the original function
        const newPromise = fn(...args);
        // Store the promise in the cache immediately
        const pin = cache.set(key, newPromise);
        // If the promise rejects, remove it from the cache so it can be retried.
        pin.value.catch(() => {
            // Only delete if the promise in the cache is still the one that failed.
            // This prevents deleting a newer, valid promise if a retry happened quickly.
            if (cache.get(key) === newPromise) {
                cache.delete(key);
            }
        });
        // If buffer length is exceeded, remove the oldest entry (the first inserted)
        return pin.value;
    };
}

export { weakMemo };
//# sourceMappingURL=weakMemo.js.map
