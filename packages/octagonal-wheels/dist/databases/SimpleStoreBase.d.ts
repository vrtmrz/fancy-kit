/**
 * Defines the CRUD operations and transaction type for a simple key-value store.
 * @template T The type of the values stored in the store.
 */
export type SimpleStoreCRUD<T> = {
    /**
     * Retrieves the value associated with the specified key.
     * @param key The key to retrieve the value for.
     */
    get(key: string): Promise<T | undefined>;
    /**
     * Sets the value associated with the specified key.
     * @param key The key to set the value for.
     * @param value The value to be set.
     */
    set(key: string, value: T): Promise<void>;
    /**
     * Deletes the value associated with the specified key.
     * @param key The key to delete the value for.
     */
    delete(key: string): Promise<void>;
    /**
     * Retrieves an array of keys within the specified range.
     * @param from The starting key (inclusive) of the range. If undefined, starts from the first key.
     * @param to The ending key (inclusive) of the range. If undefined, ends at the last key.
     * @param count The maximum number of keys to retrieve. If not specified, retrieves all keys within the range.
     */
    keys(from: string | undefined, to: string | undefined, count?: number): Promise<string[]>;
};
export type SimpleStoreCRUDSupportTransaction<T> = SimpleStoreCRUD<T> & {
    /**
     * Begins a transaction and provides a callback with the transaction object.
     * @param callback The callback function that receives a transaction object.
     * @returns A Promise that resolves when the transaction is completed.
     * Note: if you perform asynchronous operations inside the callback, some backends may automatically commit the transaction in some chances of microtasks.
     */
    beginTransaction(callback: (tx: SimpleStoreTransaction<T>) => void | Promise<void>): Promise<void>;
};
export type SimpleStoreTransaction<T> = SimpleStoreCRUD<T> & {
    /**
     * Commits the transaction.
     */
    commit(): void;
    /**
     * Aborts the transaction.
     */
    abort(): void;
};
/**
 * Represents a simple key-value store.
 * @template T The type of values stored in the store.
 */
export interface SimpleStore<T, TBackend = any> extends SimpleStoreCRUD<T> {
    get db(): Promise<TBackend> | undefined;
    /**
     * Retrieves the value associated with the specified key.
     * @param key The key to retrieve the value for.
     * @returns A Promise that resolves to the value associated with the key, or undefined if the key does not exist.
     */
    get(key: string): Promise<T | undefined>;
    /**
     * Sets the value associated with the specified key.
     * @param key The key to set the value for.
     * @param value The value to be set.
     * @returns A Promise that resolves when the value is successfully set.
     */
    set(key: string, value: T): Promise<void>;
    /**
     * Deletes the value associated with the specified key.
     * @param key The key to delete the value for.
     * @returns A Promise that resolves when the value is successfully deleted.
     */
    delete(key: string): Promise<void>;
    /**
     * Retrieves an array of keys within the specified range.
     * @param from The starting key (inclusive) of the range. If undefined, starts from the first key.
     * @param to The ending key (inclusive) of the range. If undefined, ends at the last key.
     * @param count The maximum number of keys to retrieve. If not specified, retrieves all keys within the range.
     * @returns A Promise that resolves to an array of keys within the specified range.
     */
    keys(from: string | undefined, to: string | undefined, count?: number): Promise<string[]>;
}
/**
 * Represents a base class for a simple key-value-store.
 * @template T The type of the values stored in the store.
 */
export declare abstract class SimpleStoreBase<T, TBackend = any> implements SimpleStore<T, TBackend> {
    /**
     * Gets the underlying database instance.
     * @returns A Promise that resolves to the database instance, or undefined if not available.
     */
    abstract get db(): Promise<TBackend> | undefined;
    /**
     * Retrieves the value associated with the specified key.
     * @param key The key to retrieve the value for.
     */
    abstract get(key: string): Promise<T | undefined>;
    /**
     * Sets the value associated with the specified key.
     * @param key The key to set the value for.
     * @param value The value to be set.
     */
    abstract set(key: string, value: T): Promise<void>;
    /**
     * Deletes the value associated with the specified key.
     * @param key The key to delete the value for.
     */
    abstract delete(key: string): Promise<void>;
    /**
     * Retrieves an array of keys within the specified range.
     * @param from The starting key (inclusive) of the range. If undefined, starts from the first key.
     * @param to The ending key (inclusive) of the range. If undefined, ends at the last key.
     * @param count The maximum number of keys to retrieve. If not specified, retrieves all keys within the range.
     */
    abstract keys(from?: string, to?: string, count?: number): Promise<string[]>;
    /**
     * Retrieves an array of IndexedDB keys within the specified range.
     * @param query The key or key range to query.
     * @param count The maximum number of keys to retrieve. If not specified, retrieves all keys within the range.
     */
    abstract keysIDB(query?: IDBValidKey | IDBKeyRange, count?: number): Promise<IDBValidKey[]>;
    /**
     * Clears all entries in the store.
     */
    abstract clear(): Promise<void>;
    /**
     * Closes the store.
     */
    abstract close(): void;
    /**
     * Destroys the store and releases all resources.
     */
    abstract destroy(): Promise<void>;
}
export declare abstract class ExtendedSimpleStore<T, TBackend = any> extends SimpleStoreBase<T, TBackend> implements SimpleStoreCRUDSupportTransaction<T> {
    /**
     * Opens a SimpleStore instance.
     * @param name a name for the database
     * @param instanceName an optional instance name for the database (if not provided, a default instance name will be used)
     * @returns A SimpleStore instance.
     */
    static open: <T>(name: string, instanceName?: string) => ExtendedSimpleStore<T>;
    /**
     * Gets an active SimpleStore instance by its instance name.
     * @param instanceName The instance name of the SimpleStore.
     * @returns The SimpleStore instance if it exists, otherwise undefined.
     */
    static getActiveInstance: <T>(instanceName: string) => ExtendedSimpleStore<T> | undefined;
    /**
     * Checks if there is an active SimpleStore instance with the specified instance name.
     * @param instanceName The instance name to check.
     * @returns True if an active instance exists, otherwise false.
     */
    static hasActiveInstance: (instanceName: string) => boolean;
    /**
     * Deletes the database associated with the specified instance name.
     * @param instanceName The instance name of the SimpleStore to delete.
     * @returns A Promise that resolves when the database is successfully deleted.
     * All active instances with the specified instance name will be closed and destroyed.
     */
    static deleteDatabase: (instanceName: string) => Promise<void>;
    /**
     * Begins a transaction and provides a callback with the transaction object.
     * @param callback The callback function that receives the transaction object.
     * @returns A Promise that resolves when the transaction is completed.
     */
    abstract beginTransaction(callback: (tx: SimpleStoreTransaction<T>) => void): Promise<void>;
}
