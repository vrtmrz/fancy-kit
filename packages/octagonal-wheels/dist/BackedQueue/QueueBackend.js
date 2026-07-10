import { promiseWithResolvers } from '../promises.js';
import { ERROR_TRANSACTION_NOT_SUPPORTED } from './QueueBackendTypes.js';

/**
 * Backend store implemented via prefixed namespacing over a SimpleStore.
 * @template T Type of items stored in the queue.
 */
class QueueBackend {
    /**
     * Prefix used for queued items.
     */
    get prefix() {
        return this._basePrefix + "w-" + this._name + "-";
    }
    /**
     * Prefix used for items marked as processing.
     */
    get processingPrefix() {
        return this._basePrefix + "r-" + this._name + "-";
    }
    /**
     * Constructs a QueueBackend instance.
     * @param db Backend database instance.
     * @param name Logical name for this queue namespace.
     * @param basePrefix Root prefix applied to all keys.
     * @param shouldBypass Optional predicate to bypass certain keys.
     */
    constructor(db, name, basePrefix, shouldBypass) {
        /**
         * Backend store used for transactional operations.
         * Either SimpleStoreCRUDSupportTransaction or SimpleStoreTransaction.
         * @protected
         */
        Object.defineProperty(this, "_backend", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * Name of this backend store.
         * @readonly
         */
        Object.defineProperty(this, "_name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * Base prefix used to namespace keys.
         * Ensures keys remain distinct and ordered.
         * @protected
         * @readonly
         */
        Object.defineProperty(this, "_basePrefix", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * Predicate to decide whether a key is bypassed during queue scanning.
         * @protected
         */
        Object.defineProperty(this, "_shouldBypassKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => false
        });
        // QueueKey generation parameters
        Object.defineProperty(this, "_startupTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: Date.now()
        });
        Object.defineProperty(this, "_sessionRandom", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: Math.floor(Math.random() * 36 * 36)
        });
        Object.defineProperty(this, "_incrementalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        this._backend = db;
        this._name = name;
        this._basePrefix = basePrefix;
        if (shouldBypass) {
            this._shouldBypassKey = shouldBypass;
        }
    }
    /**
     * Retrieves a queued item by key.
     * @returns Promise resolving to the item, or undefined if absent.
     */
    getQueuedItem(key) {
        return this._backend.get(this.prefix + key);
    }
    /**
     * Stores a queued item by key.
     */
    setQueueItem(key, item) {
        return this._backend.set(this.prefix + key, item);
    }
    /**
     * Removes a queued item by key.
     */
    deleteQueueItem(key) {
        return this._backend.delete(this.prefix + key);
    }
    /**
     * Retrieves a processing item by key.
     * @returns Promise resolving to the item, or undefined if absent.
     */
    getProcessingItem(key) {
        return this._backend.get(this.processingPrefix + key);
    }
    /**
     * Stores a processing item by key.
     */
    setProcessingItem(key, item) {
        return this._backend.set(this.processingPrefix + key, item);
    }
    /**
     * Removes a processing item by key.
     */
    deleteProcessingItem(key) {
        return this._backend.delete(this.processingPrefix + key);
    }
    /**
     * Performs a series of operations atomically inside a transaction.
     * @param callback Function receiving a transactional queue backend.
     * @returns Result returned by the callback.
     */
    async atomic(callback) {
        const pr = promiseWithResolvers();
        if ("beginTransaction" in this._backend === false) {
            throw new Error(ERROR_TRANSACTION_NOT_SUPPORTED);
        }
        try {
            let result;
            await this._backend.beginTransaction(async (txDB) => {
                const tx = new QueueBackend(txDB, this._name, this._basePrefix);
                result = await callback(tx);
            });
            pr.resolve(result);
        }
        catch (e) {
            pr.reject(e);
        }
        return pr.promise;
    }
    /**
     * Retrieves keys in a range.
     * @param from Inclusive start key (optional).
     * @param to Inclusive end key (optional).
     * @param count Maximum number of keys (optional).
     */
    keys(from, to, count) {
        return this._backend.keys(from, to, count);
    }
    /**
     * Retrieves the next available queue key (without item mutation).
     * Skips bypassed keys.
     * @returns Next queue key, or undefined if none.
     */
    async getNextQueueKey() {
        let currentKey = this.prefix;
        const fetchPageSize = 10;
        while (true) {
            const keys = await this.keys(currentKey, this.prefix + "\uffff", fetchPageSize);
            for (const key of keys) {
                if (this._shouldBypassKey(key)) {
                    continue;
                }
                return key.substring(this.prefix.length);
            }
            if (keys.length < fetchPageSize) {
                break;
            }
            currentKey = keys[keys.length - 1] + "\uffff";
        }
        return undefined;
    }
    /**
     * Issues a new unique queue key.
     */
    issueNewQueueKey() {
        const p = this._startupTime.toString(36).padStart(8, "0");
        const rand = this._sessionRandom.toString(36).padStart(2, "0");
        const i = (this._incrementalId++).toString(36).padStart(5, "0");
        return this.prefix + p + "-" + rand + "-" + i;
    }
}

export { QueueBackend };
//# sourceMappingURL=QueueBackend.js.map
