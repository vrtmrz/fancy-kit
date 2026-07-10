const UNDEFINED = Symbol("undefined");

// Implements a cache using Map with LRU (Least Recently Used) eviction policy.
// Not a full LRU implementation, for full LRU use `LRUCache`.
export function memoWithMap<T extends any[], TResult>(
    bufferLength: number,
    fn: (...args: T) => Promise<TResult>,
    keyFunction?: (args: T) => string
): (...args: T) => Promise<TResult> {
    if (bufferLength <= 0) {
        throw new Error("Buffer length must be greater than 0");
    }
    // Use Map to implement the cache
    const cache = new Map<string, Promise<TResult>>();

    // Helper to generate a key from all arguments
    const getKey = (args: T): string => {
        return args.length > 0 && typeof args[0] === "string"
            ? args[0]
            : JSON.stringify(args, (key, value) => (value === undefined ? UNDEFINED : value));
    };

    return function (...args: T): Promise<TResult> {
        const key = keyFunction ? keyFunction(args) : getKey(args);

        // --- Cache Hit ---
        // Performance improvement: O(1) lookup
        if (cache.has(key)) {
            const hitPromise = cache.get(key)!;
            // Update LRU: delete and re-set to move to the end (most recent)
            cache.delete(key);
            cache.set(key, hitPromise);
            return hitPromise;
        }

        // --- Cache Miss ---
        // Call the original function
        const newPromise = fn(...args);

        // Store the promise in the cache immediately
        cache.set(key, newPromise);

        // If the promise rejects, remove it from the cache so it can be retried.
        newPromise.catch(() => {
            // Only delete if the promise in the cache is still the one that failed.
            // This prevents deleting a newer, valid promise if a retry happened quickly.
            if (cache.get(key) === newPromise) {
                cache.delete(key);
            }
        });

        // If buffer length is exceeded, remove the oldest entry (the first inserted)
        if (cache.size > bufferLength) {
            // Get the oldest key using Map.keys().next().value
            const oldestKey = cache.keys().next().value;
            // The check 'if (oldestKey)' is technically not needed since cache.size > 0,
            // but it's safe to keep.
            if (oldestKey) cache.delete(oldestKey);
        }

        return newPromise;
    };
}
