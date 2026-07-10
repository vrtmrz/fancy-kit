import { Logger, LOG_LEVEL_VERBOSE } from '../common/logger.js';

/**
 * Represents a Least Recently Used (LRU) Cache.
 * @template K The type of the cache keys.
 * @template V The type of the cache values.
 */
class LRUCache {
    /**
     * Creates a new instance of the LRUCache class.
     * @param maxCache The maximum number of items to cache.
     * @param maxCacheLength The maximum length of the cached values.
     * @param forwardOnly True if we only need to cache forward values.
     */
    constructor(maxCache, maxCacheLength, forwardOnly = false) {
        Object.defineProperty(this, "cache", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map([])
        });
        Object.defineProperty(this, "revCache", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map([])
        });
        Object.defineProperty(this, "maxCache", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 200
        });
        Object.defineProperty(this, "maxCachedLength", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 50000000
        }); // means 50 mb to 400mb.
        Object.defineProperty(this, "cachedLength", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "enableReversed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
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
    has(key) {
        return this.cache.has(key);
    }
    /**
     * Gets the value associated with the specified key from the cache.
     * @param key The key to retrieve the value for.
     * @returns The value associated with the key, or undefined if the key is not found.
     * @remarks After calling this method, the key will be updated to recently used.
     */
    get(key) {
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
    revGet(value) {
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
    set(key, value) {
        this.cache.set(key, value);
        if (this.enableReversed)
            this.revCache.set(value, key);
        this.cachedLength += `${value}`.length;
        if (this.cache.size > this.maxCache || this.cachedLength > this.maxCachedLength) {
            for (const [key, value] of this.cache) {
                this.cache.delete(key);
                if (this.enableReversed)
                    this.revCache.delete(value);
                this.cachedLength -= `${value}`.length;
                if (this.cache.size <= this.maxCache && this.cachedLength <= this.maxCachedLength)
                    break;
            }
        }
    }
}

export { LRUCache };
//# sourceMappingURL=LRUCache.js.map
