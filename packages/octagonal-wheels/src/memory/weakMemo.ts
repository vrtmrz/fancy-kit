import { VolatileValueCache } from "./VolatileValueCache.ts";

function getStringifiedKey(key: any): string {
    if (key === undefined) return "undefined";
    if (typeof key === "string" || typeof key === "number") return String(key);
    return JSON.stringify(key);
}

/**
 * Creates a weakly memoized version of an asynchronous function.
 * @param fn The asynchronous function to memoize.
 * @param keyFunction An optional function to generate a cache key from the function arguments.
 * @returns A new function that memoizes the results of the original function.
 */
export function weakMemo<T extends any[], TResult>(
    fn: (...args: T) => Promise<TResult>,
    keyFunction?: (args: T) => string
): (...args: T) => Promise<TResult> {
    const cache = new VolatileValueCache<string, Promise<TResult>>();

    // Helper to generate a key from all arguments
    const getKey = (args: T): string => {
        return args.length == 0 ? "" : args.map((e) => getStringifiedKey(e)).join("-");
    };
    const keyFunc = keyFunction || getKey;

    return function (...args: T): Promise<TResult> {
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
