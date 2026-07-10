import { openDB, deleteDB } from 'idb';
import { SimpleStoreBase } from './SimpleStoreBase.js';
import { fireAndForget } from '../promises.js';
import { Logger, LOG_LEVEL_VERBOSE } from '../common/logger.js';

// Old Implementation, kept for the compatibility
/**
 * Represents a simple store using IndexedDB.
 * @template T - The type of the values stored in the store.
 */
class SimpleStoreIDBv1 extends SimpleStoreBase {
    constructor(name) {
        super();
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_db", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = name;
        this.initDB(name);
    }
    get db() {
        return this._db;
    }
    initDB(name) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _self = this;
        this._db = openDB(name, 1, {
            upgrade(db) {
                db.createObjectStore(name);
            },
            blocking(ver, verTo, evt) {
                Logger("Database blocking upgrade: " + name, LOG_LEVEL_VERBOSE);
                try {
                    const f = () => async () => {
                        try {
                            (await _self._db)?.close();
                            Logger("Database closed for upgrade: " + name, LOG_LEVEL_VERBOSE);
                        }
                        catch (e) {
                            Logger("Error closing database in blocking handler: " + name, LOG_LEVEL_VERBOSE);
                            Logger(e, LOG_LEVEL_VERBOSE);
                        }
                    };
                    void f();
                }
                catch (e) {
                    Logger(e, LOG_LEVEL_VERBOSE);
                }
            },
            terminated() {
                Logger("Database terminated: " + name, LOG_LEVEL_VERBOSE);
                _self.close();
            },
        });
    }
    async get(key) {
        if (this._db == undefined)
            throw new Error("Database not initialized or already destroyed");
        return await (await this._db).get(this.name, key);
    }
    async set(key, value) {
        if (this._db == undefined)
            throw new Error("Database not initialized or already destroyed");
        return await (await this._db).put(this.name, value, key);
    }
    async delete(key) {
        if (this._db == undefined)
            throw new Error("Database not initialized or already destroyed");
        return await (await this._db).delete(this.name, key);
    }
    async keys(from, to, count) {
        if (this._db == undefined)
            throw new Error("Database not initialized or already destroyed");
        const range = from && to
            ? IDBKeyRange.bound(from, to)
            : from
                ? IDBKeyRange.lowerBound(from)
                : to
                    ? IDBKeyRange.upperBound(to)
                    : undefined;
        return await (await this._db).getAllKeys(this.name, range, count);
    }
    async keysIDB(query, count) {
        if (this._db == undefined)
            throw new Error("Database not initialized or already destroyed");
        return await (await this._db).getAllKeys(this.name, query, count);
    }
    async clear() {
        if (this._db == undefined)
            throw new Error("Database not initialized or already destroyed");
        return (await this._db).clear(this.name);
    }
    close() {
        fireAndForget(async () => {
            if (this._db == undefined)
                throw new Error("Database not initialized or already destroyed");
            (await this._db).close();
            this._db = undefined;
        });
    }
    async destroy() {
        if (this._db == undefined)
            throw new Error("Database not initialized or already destroyed");
        (await this._db).close();
        this._db = undefined;
        const name = this.name;
        return await deleteDB(name, {
            blocked(ver, evt) {
                Logger("Database delete blocked: " + name, LOG_LEVEL_VERBOSE);
            },
        });
    }
}

export { SimpleStoreIDBv1 };
//# sourceMappingURL=SimpleStoreIDBv1.js.map
