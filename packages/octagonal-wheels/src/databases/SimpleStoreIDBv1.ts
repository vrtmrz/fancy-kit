// Old Implementation, kept for the compatibility
import { deleteDB, openDB, type IDBPDatabase } from "idb";
import { SimpleStoreBase } from "./SimpleStoreBase.ts";
import { fireAndForget } from "../promises.ts";
import { LOG_LEVEL_VERBOSE, Logger } from "../common/logger.ts";

/**
 * Represents a simple store using IndexedDB.
 * @template T - The type of the values stored in the store.
 */
export class SimpleStoreIDBv1<T> extends SimpleStoreBase<T, IDBPDatabase<any>> {
    name: string;
    constructor(name: string) {
        super();
        this.name = name;
        this.initDB(name);
    }
    _db?: Promise<IDBPDatabase<any>>;
    get db(): Promise<IDBPDatabase<any>> | undefined {
        return this._db;
    }

    initDB(name: string) {
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
                        } catch (e) {
                            Logger("Error closing database in blocking handler: " + name, LOG_LEVEL_VERBOSE);
                            Logger(e, LOG_LEVEL_VERBOSE);
                        }
                    };
                    void f();
                } catch (e) {
                    Logger(e, LOG_LEVEL_VERBOSE);
                }
            },
            terminated() {
                Logger("Database terminated: " + name, LOG_LEVEL_VERBOSE);
                _self.close();
            },
        });
    }

    async get(key: string): Promise<T | undefined> {
        if (this._db == undefined) throw new Error("Database not initialized or already destroyed");
        return await (await this._db).get(this.name, key);
    }

    async set(key: string, value: T): Promise<void> {
        if (this._db == undefined) throw new Error("Database not initialized or already destroyed");
        return await (await this._db).put(this.name, value, key);
    }

    async delete(key: string): Promise<void> {
        if (this._db == undefined) throw new Error("Database not initialized or already destroyed");
        return await (await this._db).delete(this.name, key);
    }
    async keys(from?: string | undefined, to?: string | undefined, count?: number | undefined): Promise<string[]> {
        if (this._db == undefined) throw new Error("Database not initialized or already destroyed");
        const range =
            from && to
                ? IDBKeyRange.bound(from, to)
                : from
                  ? IDBKeyRange.lowerBound(from)
                  : to
                    ? IDBKeyRange.upperBound(to)
                    : undefined;
        return await (await this._db).getAllKeys(this.name, range, count);
    }
    async keysIDB(query?: IDBValidKey | IDBKeyRange, count?: number): Promise<IDBValidKey[]> {
        if (this._db == undefined) throw new Error("Database not initialized or already destroyed");
        return await (await this._db).getAllKeys(this.name, query, count);
    }

    async clear(): Promise<void> {
        if (this._db == undefined) throw new Error("Database not initialized or already destroyed");
        return (await this._db).clear(this.name);
    }

    close(): void {
        fireAndForget(async () => {
            if (this._db == undefined) throw new Error("Database not initialized or already destroyed");
            (await this._db).close();
            this._db = undefined!;
        });
    }

    async destroy(): Promise<void> {
        if (this._db == undefined) throw new Error("Database not initialized or already destroyed");
        (await this._db).close();
        this._db = undefined!;
        const name = this.name;
        return await deleteDB(name, {
            blocked(ver, evt) {
                Logger("Database delete blocked: " + name, LOG_LEVEL_VERBOSE);
            },
        });
    }
}
