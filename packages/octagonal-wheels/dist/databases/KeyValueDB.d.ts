/**
 * Represents a key-value database.
 */
export interface KeyValueDatabase {
    /**
     * Retrieves the value associated with the specified key.
     * @param key - The key to retrieve the value for.
     * @returns A promise that resolves with the retrieved value.
     */
    get<T>(key: IDBValidKey): Promise<T>;
    /**
     * Sets the value associated with the specified key.
     * @param key - The key to set the value for.
     * @param value - The value to be set.
     * @returns A promise that resolves with the key.
     */
    set<T>(key: IDBValidKey, value: T): Promise<IDBValidKey>;
    /**
     * Deletes the value associated with the specified key.
     * @param key - The key to delete the value for.
     * @returns A promise that resolves when the value is deleted.
     */
    del(key: IDBValidKey): Promise<void>;
    /**
     * Clears all key-value pairs in the database.
     * @returns A promise that resolves when the database is cleared.
     */
    clear(): Promise<void>;
    /**
     * Retrieves an array of keys that match the specified query.
     * @param query - The query to match the keys against.
     * @param count - The maximum number of keys to retrieve.
     * @returns A promise that resolves with an array of keys.
     */
    keys(query?: IDBValidKey | IDBKeyRange, count?: number): Promise<IDBValidKey[]>;
    /**
     * Closes the database connection.
     */
    close(): void;
    /**
     * Destroys the database and removes all data.
     * @returns A promise that resolves when the database is destroyed.
     */
    destroy(): Promise<void>;
}
/**
 * Opens a key-value database and returns a promise that resolves to a KeyValueDatabase object.
 * If the database with the given key already exists in the cache, it will be closed and removed from the cache before opening a new one.
 * @param dbKey - The key of the database.
 * @returns A promise that resolves to a KeyValueDatabase object.
 */
export declare function OpenKeyValueDatabase(dbKey: string): Promise<KeyValueDatabase>;
