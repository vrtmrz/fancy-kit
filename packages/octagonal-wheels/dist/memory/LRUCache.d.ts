/**
 * Represents a Least Recently Used (LRU) Cache.
 * @template K The type of the cache keys.
 * @template V The type of the cache values.
 */
export declare class LRUCache<K, V> {
    private cache;
    private revCache;
    maxCache: number;
    maxCachedLength: number;
    cachedLength: number;
    enableReversed: boolean;
    /**
     * Creates a new instance of the LRUCache class.
     * @param maxCache The maximum number of items to cache.
     * @param maxCacheLength The maximum length of the cached values.
     * @param forwardOnly True if we only need to cache forward values.
     */
    constructor(maxCache: number, maxCacheLength: number, forwardOnly?: boolean);
    /**
     * Clears the cache.
     */
    clear(): void;
    /**
     * Checks if the cache contains the specified key.
     * @param key The key to check.
     * @returns A boolean indicating whether the cache contains the key.
     */
    has(key: K): boolean;
    /**
     * Gets the value associated with the specified key from the cache.
     * @param key The key to retrieve the value for.
     * @returns The value associated with the key, or undefined if the key is not found.
     * @remarks After calling this method, the key will be updated to recently used.
     */
    get(key: K): V | undefined;
    /**
     * Gets the key associated with the specified value from the cache.
     * @param value The value to retrieve the key for.
     * @returns The key associated with the value, or undefined if the value is not found.
     * @remarks After calling this method, the key will be updated to recently used.
     */
    revGet(value: V): K | undefined;
    /**
     * Sets the value associated with the specified key in the cache.
     * @param key The key to set the value for.
     * @param value The value to set.
     */
    set(key: K, value: V): void;
}
