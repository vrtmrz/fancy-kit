import { deleteDB, openDB } from 'idb';
import { ExtendedSimpleStore } from './SimpleStoreBase.js';
import { promiseWithResolvers } from '../promises.js';
import { Logger, LOG_LEVEL_VERBOSE } from '../common/logger.js';
import { SIMPLE_STORE_EVENT_TYPES, ErrorDatabaseDestroyed, DATABASE_DESTROYED_ERROR, buildIDBRange, DatabaseTransactionError, DatabaseTransactionAbortError } from './dbcommon.js';
import { FallbackWeakRef } from '../common/polyfill.js';

/**
 * Represents a simple store using IndexedDB.
 * @template T - The type of the values stored in the store.
 */
class SimpleStoreIDBv2 extends ExtendedSimpleStore {
    /**
     * Open a SimpleStoreIDB instance.
     * @param name - The name of the store.
     * @returns SimpleStoreIDB<U>.
     */
    static open(name, instanceName) {
        if (!instanceName) {
            instanceName = name;
        }
        if (SimpleStoreIDBv2.hasActiveInstance(instanceName)) {
            const active = SimpleStoreIDBv2.getActiveInstance(instanceName);
            if (active) {
                return active;
            }
        }
        const instance = new SimpleStoreIDBv2(name, instanceName);
        return instance;
    }
    /**
     * Gets the active instance by name.
     * @param instanceName - The name of the instance.
     * @returns The active SimpleStoreIDB instance or undefined if not found.
     */
    static getActiveInstance(instanceName) {
        const activeRef = SimpleStoreIDBv2._activeDBs.get(instanceName);
        const active = activeRef?.deref();
        return active;
    }
    /**
     * Checks if there is an active instance with the given name.
     * @param instanceName - The name of the instance.
     * @returns True if an active instance exists, false otherwise.
     */
    static hasActiveInstance(instanceName) {
        const active = SimpleStoreIDBv2.getActiveInstance(instanceName);
        return active !== undefined;
    }
    /**
     * Deletes the database with the given instance name.
     * @param instanceName - The name of the instance.
     */
    static async deleteDatabase(instanceName) {
        // Close active instance if exists
        const active = SimpleStoreIDBv2.getActiveInstance(instanceName);
        active?.closeDatabase();
        await deleteDB(instanceName, {
            blocked: (a, b) => {
                Logger("Delete (by deleteDatabase) blocked for database: " + instanceName, LOG_LEVEL_VERBOSE);
                Logger(`eventVersion: ${a}, eventBlockedBy: ${JSON.stringify(b)}`, LOG_LEVEL_VERBOSE);
            },
        });
    }
    /**
     * Gets the name of the store.
     */
    get name() {
        return this._name;
    }
    /**
     * Gets the actual IDBDatabase connection.
     * @returns A promise that resolves to the IDBDatabase instance.
     */
    get db() {
        return Promise.resolve(this._db);
    }
    _emit(eventName, payload) {
        const event = new CustomEvent(eventName, {
            bubbles: false,
            cancelable: false,
            detail: {
                ...payload,
                instanceName: this._instanceName,
                name: this._name,
                type: eventName,
            },
        });
        this._et.dispatchEvent(event);
    }
    addEventListener(eventName, listener, options) {
        this._et.addEventListener(eventName, listener, options);
    }
    removeEventListener(eventName, listener, options) {
        this._et.removeEventListener(eventName, listener, options);
    }
    prepareDBPromise() {
        const name = this._name;
        // Capture this for use in the upgrade function
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _self = this;
        const _dbPromise = openDB(name, 1, {
            upgrade(db) {
                db.createObjectStore(name);
            },
            blocking() {
                Logger("Database blocking upgrade: " + name, LOG_LEVEL_VERBOSE);
                try {
                    _self._db.close();
                    Logger("Database closed for upgrade: " + name, LOG_LEVEL_VERBOSE);
                }
                catch (e) {
                    // May not happen, but just in case
                    // Coverage kept for safety
                    Logger(e, LOG_LEVEL_VERBOSE);
                }
            },
            terminated() {
                // Hard to test, but just in case
                // Coverage kept for safety
                Logger("Database terminated: " + name, LOG_LEVEL_VERBOSE);
                _self.closeDatabase();
            },
        });
        this.__db = _dbPromise;
        this._emit(SIMPLE_STORE_EVENT_TYPES.INITIALISED, {
            reason: "Database initialised",
            count: ++this._initCounter,
        });
    }
    constructor(name, instanceName) {
        if (!instanceName) {
            instanceName = name;
        }
        if (SimpleStoreIDBv2.getActiveInstance(instanceName) !== undefined) {
            throw new Error("An active instance with the same name already exists. Use SimpleStoreIDBv2.open(name) to get the existing instance.");
        }
        super();
        Object.defineProperty(this, "_name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // Instance name for identifying active instances
        Object.defineProperty(this, "_instanceName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // The promise that resolves to the IDB database instance
        Object.defineProperty(this, "__db", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // The actual IDB database instance
        Object.defineProperty(this, "_db", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        //#region Event Management
        // Event target for managing event listeners
        Object.defineProperty(this, "_et", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new EventTarget()
        });
        //#endregion
        Object.defineProperty(this, "_initCounter", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "_openCounter", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        this._name = name;
        this._instanceName = instanceName;
        this.prepareDBPromise();
        SimpleStoreIDBv2._activeDBs.set(instanceName, new FallbackWeakRef(this));
    }
    /**
     * Checks if the database is not initialised.
     * @returns True if the database is not initialised, false otherwise.
     */
    isNotInitialised() {
        return this._db == undefined;
    }
    /**
     * Checks if the database is destroyed.
     * @returns True if the database is destroyed, false otherwise.
     */
    isDestroyed() {
        return this.__db == undefined;
    }
    /**
     * Checks if the database is opened.
     * @returns True if the database is opened, false otherwise.
     */
    isOpened() {
        if (this.isNotInitialised()) {
            return false;
        }
        if (this.isDestroyed()) {
            // May not happen, but just in case
            // Coverage kept for safety
            return false;
        }
        return true;
    }
    /**
     * Ensures the database is initialized.
     * @returns
     */
    async ensureDB() {
        this._db = await this.__db;
        this._db.addEventListener("versionchange", () => {
            // This may indicate that another instance is upgrading the database
            Logger("Database version change detected, instance released and prepared for next request: " +
                this._instanceName, LOG_LEVEL_VERBOSE);
            this._db = undefined;
            this.prepareDBPromise();
        });
        this._emit(SIMPLE_STORE_EVENT_TYPES.OPENED, {
            reason: "Database opened",
            count: ++this._openCounter,
        });
    }
    /**
     * Processes a callback with database checks (not destroyed, initialised).
     * @param callback a callback that takes the IDBDatabase and returns a promise
     * @returns
     */
    _processWithCheck(callback, preventError = false) {
        if (this.isDestroyed() && !preventError) {
            throw new ErrorDatabaseDestroyed(DATABASE_DESTROYED_ERROR);
        }
        if (this.isNotInitialised()) {
            return this.ensureDB().then(() => {
                return callback(this._db);
            });
        }
        else {
            return callback(this._db);
        }
    }
    untrackDatabaseInstance() {
        this._db = undefined;
        this.__db = undefined;
        SimpleStoreIDBv2._activeDBs.delete(this._instanceName);
    }
    /**
     * Closes the database and removes it from active instances.
     */
    closeDatabase() {
        if (this._db) {
            this._db.close();
        }
        // This may called from event listeners.
        this.untrackDatabaseInstance();
        this._emit(SIMPLE_STORE_EVENT_TYPES.CLOSED, { reason: "Database closed" });
    }
    /**
     * Retrieves the value associated with the specified key.
     * @param key The key to retrieve from the store.
     * @returns A promise that resolves to the value associated with the key, or undefined if not found.
     */
    get(key) {
        return this._processWithCheck((db) => db.get(this.name, key));
    }
    /**
     * Stores a value with the specified key.
     * @param key The key to associate with the value.
     * @param value The value to store.
     * @returns A promise that resolves when the operation is complete.
     */
    set(key, value) {
        return this._processWithCheck((db) => db.put(this.name, value, key));
    }
    /**
     * Deletes the value associated with the specified key.
     * @param key The key to delete from the store.
     * @returns A promise that resolves when the operation is complete.
     */
    delete(key) {
        return this._processWithCheck((db) => db.delete(this.name, key));
    }
    /**
     * Retrieves an array of keys within the specified range.
     * @param from The lower bound of the key range.
     * @param to The upper bound of the key range.
     * @param count The maximum number of keys to retrieve.
     * @returns A promise that resolves to an array of keys within the specified range.
     */
    keys(from, to, count) {
        const range = buildIDBRange(from, to);
        return this.keysIDB(range, count).then((keys) => keys.map((key) => key.toString()));
    }
    /**
     * Retrieves an array of keys matching the specified query.
     * @param query The query to match the keys against.
     * @param count The maximum number of keys to retrieve.
     * @returns A promise that resolves to an array of keys matching the query.
     */
    keysIDB(query, count) {
        return this._processWithCheck((db) => {
            return db.getAllKeys(this.name, query, count);
        });
    }
    /**
     * Clears all key-value pairs in the store.
     * @returns A promise that resolves when the store is cleared.
     */
    clear() {
        return this._processWithCheck((db) => {
            return db.clear(this.name);
        });
    }
    /**
     * Closes the database and removes it from active instances.
     * @returns void.
     */
    close() {
        return void this._processWithCheck((db) => {
            this.closeDatabase();
            return Promise.resolve();
        }, true);
    }
    /**
     * Destroys the database and removes all data.
     * Note: This also closes the database if it is open.
     * @returns A promise that resolves when the database is destroyed.
     */
    destroy() {
        return this._processWithCheck(async (db) => {
            try {
                this.closeDatabase();
                const result = await deleteDB(this.name, {
                    blocked: (a, b) => {
                        Logger("Delete blocked for database: " + this.name, LOG_LEVEL_VERBOSE);
                    },
                });
                return result;
            }
            finally {
                this._emit(SIMPLE_STORE_EVENT_TYPES.DESTROYED, { reason: "Database destroyed" });
            }
        });
    }
    /**
     * Begins a transaction and executes the provided callback within the transaction context.
     * @param callback - The callback function to execute within the transaction.
     * @returns A promise that resolves when the transaction is complete.
     * Note: Nested transactions are not supported.
     * Transaction will be automatically committed unless aborted before the event loop runs.
     */
    beginTransaction(callback) {
        return this._processWithCheck(async (db) => {
            const p = promiseWithResolvers();
            let causeOfAbort = undefined;
            try {
                const tx = db.transaction(this.name, "readwrite");
                const store = tx.objectStore(this.name);
                let isCommittedOrAborted = false;
                const transaction = {
                    get: async (key) => {
                        return await store.get(key);
                    },
                    set: async (key, value) => {
                        await store.put(value, key);
                    },
                    delete: async (key) => {
                        await store.delete(key);
                    },
                    keys: async (from, to, count) => {
                        const range = buildIDBRange(from, to);
                        return await store.getAllKeys(range, count);
                    },
                    commit: () => {
                        if (isCommittedOrAborted) {
                            throw new DatabaseTransactionError("Transaction already committed or aborted");
                        }
                        isCommittedOrAborted = true;
                        tx.commit();
                        // await tx.done;
                    },
                    abort: () => {
                        if (isCommittedOrAborted) {
                            throw new DatabaseTransactionError("Transaction already committed or aborted");
                        }
                        isCommittedOrAborted = true;
                        tx.abort();
                    },
                };
                try {
                    // Run the callback and wait for it to complete
                    await callback(transaction);
                    await tx.done;
                    // Then resolve the promise
                    p.resolve();
                }
                catch (e) {
                    // If an error occurs, abort the transaction and reject the promise
                    if (!isCommittedOrAborted) {
                        // Mark the cause of abort before aborting the transaction
                        // Actual Error should be automatically caught on the outside
                        causeOfAbort = e instanceof Error ? e : DatabaseTransactionError.fromError(e);
                        tx.abort();
                        await tx.done;
                    }
                    else {
                        // Otherwise just throw the error
                        throw e;
                    }
                }
            }
            catch (e) {
                // Handle transaction errors
                if (e instanceof Error && e.name === "AbortError") {
                    const abortError = DatabaseTransactionAbortError.fromError(e);
                    if (causeOfAbort) {
                        // Attach the original error that caused the abort
                        abortError.setAbortedError(causeOfAbort);
                    }
                    p.reject(abortError);
                }
                else {
                    // Reject with a general transaction error
                    p.reject(DatabaseTransactionError.fromError(e));
                }
            }
            // Return the promise representing the transaction's completion
            return p.promise;
        });
    }
    commit() {
        // Noop, just for interface compatibility
        return;
    }
    abort() {
        // Noop, just for interface compatibility
        throw new DatabaseTransactionError("No active transaction to abort");
    }
}
/**
 * Map of active database instances.
 */
Object.defineProperty(SimpleStoreIDBv2, "_activeDBs", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: new Map()
});

export { SimpleStoreIDBv2 };
//# sourceMappingURL=SimpleStoreIDBv2.js.map
