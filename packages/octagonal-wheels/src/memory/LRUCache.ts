import { Logger, LOG_LEVEL_VERBOSE } from "../common/logger.ts";

/**
 * Represents a Least Recently Used (LRU) Cache.
 * @template K The type of the cache keys.
 * @template V The type of the cache values.
 */
export class LRUCache<K, V> {
    private cache = new Map<K, V>([]);
    private revCache = new Map<V, K>([]);
    maxCache = 200;
    maxCachedLength = 50000000; // means 50 mb to 400mb.
    cachedLength = 0;
    enableReversed = true;

    /**
     * Creates a new instance of the LRUCache class.
     * @param maxCache The maximum number of items to cache.
     * @param maxCacheLength The maximum length of the cached values.
     * @param forwardOnly True if we only need to cache forward values.
     */
    constructor(maxCache: number, maxCacheLength: number, forwardOnly = false) {
        this.maxCache = maxCache || 200;
        this.maxCachedLength = (maxCacheLength || 1) * 1000000;
        this.enableReversed = !forwardOnly;
        Logger(`Cache initialized ${this.maxCache} / ${this.maxCachedLength}`, LOG_LEVEL_VERBOSE);
    }

    /**
     * Clears the cache.
     */
    clear() {
        this.cache.clear();
        this.revCache.clear();
    }

    /**
     * Checks if the cache contains the specified key.
     * @param key The key to check.
     * @returns A boolean indicating whether the cache contains the key.
     */
    has(key: K): boolean {
        return this.cache.has(key);
    }

    /**
     * Gets the value associated with the specified key from the cache.
     * @param key The key to retrieve the value for.
     * @returns The value associated with the key, or undefined if the key is not found.
     * @remarks After calling this method, the key will be updated to recently used.
     */
    get(key: K): V | undefined {
        const v = this.cache.get(key);

        if (v) {
            // update the key to recently used.
            this.cache.delete(key);
            this.cache.set(key, v);
            if (this.enableReversed) {
                this.revCache.delete(v);
                this.revCache.set(v, key);
            }
        }
        return v;
    }

    /**
     * Gets the key associated with the specified value from the cache.
     * @param value The value to retrieve the key for.
     * @returns The key associated with the value, or undefined if the value is not found.
     * @remarks After calling this method, the key will be updated to recently used.
     */
    revGet(value: V): K | undefined {
        const key = this.revCache.get(value);
        if (key) {
            // update the key to recently used.
            this.cache.delete(key);
            this.revCache.delete(value);
            this.cache.set(key, value);
            this.revCache.set(value, key);
        }
        return key;
    }

    /**
     * Sets the value associated with the specified key in the cache.
     * @param key The key to set the value for.
     * @param value The value to set.
     */
    set(key: K, value: V) {
        this.cache.set(key, value);
        if (this.enableReversed) this.revCache.set(value, key);
        this.cachedLength += `${value}`.length;
        if (this.cache.size > this.maxCache || this.cachedLength > this.maxCachedLength) {
            for (const [key, value] of this.cache) {
                this.cache.delete(key);
                if (this.enableReversed) this.revCache.delete(value);
                this.cachedLength -= `${value}`.length;
                if (this.cache.size <= this.maxCache && this.cachedLength <= this.maxCachedLength) break;
            }
        } else {
            // console.log([this.cache.size, this.cachedLength]);
        }
    }
}
