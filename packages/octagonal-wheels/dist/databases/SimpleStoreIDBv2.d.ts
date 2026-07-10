import { type IDBPDatabase } from "idb";
import { ExtendedSimpleStore, type SimpleStoreTransaction } from "./SimpleStoreBase.ts";
import { SIMPLE_STORE_EVENT_TYPES, type SimpleStoreEventTypes, type SimpleStoreEvent, type SimpleStoreInitialisedEvent, type SimpleStoreClosedEvent, type SimpleStoreDestroyedEvent, type SimpleStoreOpenedEvent } from "./dbcommon.ts";
import { FallbackWeakRef } from "../common/polyfill.ts";
/**
 * Represents a simple store using IndexedDB.
 * @template T - The type of the values stored in the store.
 */
export declare class SimpleStoreIDBv2<T> extends ExtendedSimpleStore<T, IDBPDatabase<any>> {
    /**
     * Map of active database instances.
     */
    protected static _activeDBs: Map<string, FallbackWeakRef<SimpleStoreIDBv2<any>>>;
    /**
     * Open a SimpleStoreIDB instance.
     * @param name - The name of the store.
     * @returns SimpleStoreIDB<U>.
     */
    static open<U>(name: string, instanceName?: string): SimpleStoreIDBv2<U>;
    /**
     * Gets the active instance by name.
     * @param instanceName - The name of the instance.
     * @returns The active SimpleStoreIDB instance or undefined if not found.
     */
    static getActiveInstance<T>(instanceName: string): SimpleStoreIDBv2<T> | undefined;
    /**
     * Checks if there is an active instance with the given name.
     * @param instanceName - The name of the instance.
     * @returns True if an active instance exists, false otherwise.
     */
    static hasActiveInstance(instanceName: string): boolean;
    /**
     * Deletes the database with the given instance name.
     * @param instanceName - The name of the instance.
     */
    static deleteDatabase(instanceName: string): Promise<void>;
    /**
     * Gets the name of the store.
     */
    get name(): string;
    _name: string;
    _instanceName: string;
    private __db;
    private _db;
    /**
     * Gets the actual IDBDatabase connection.
     * @returns A promise that resolves to the IDBDatabase instance.
     */
    get db(): Promise<IDBPDatabase<any>> | undefined;
    private _et;
    private _emit;
    addEventListener(eventName: typeof SIMPLE_STORE_EVENT_TYPES.INITIALISED, listener: (ev: SimpleStoreInitialisedEvent) => void, options?: boolean | AddEventListenerOptions): void;
    addEventListener(eventName: typeof SIMPLE_STORE_EVENT_TYPES.CLOSED, listener: (ev: SimpleStoreClosedEvent) => void, options?: boolean | AddEventListenerOptions): void;
    addEventListener(eventName: typeof SIMPLE_STORE_EVENT_TYPES.DESTROYED, listener: (ev: SimpleStoreDestroyedEvent) => void, options?: boolean | AddEventListenerOptions): void;
    addEventListener(eventName: typeof SIMPLE_STORE_EVENT_TYPES.OPENED, listener: (ev: SimpleStoreOpenedEvent) => void, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(eventName: SimpleStoreEventTypes, listener: (ev: SimpleStoreEvent) => void, options?: boolean | EventListenerOptions): void;
    private _initCounter;
    private _openCounter;
    private prepareDBPromise;
    /**
     * @deprecated Use SimpleStoreIDBv2.open(name) instead
     * @param name - The name of the store.
     */
    constructor(name: string, instanceName?: string);
    /**
     * Checks if the database is not initialised.
     * @returns True if the database is not initialised, false otherwise.
     */
    isNotInitialised(): boolean;
    /**
     * Checks if the database is destroyed.
     * @returns True if the database is destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Checks if the database is opened.
     * @returns True if the database is opened, false otherwise.
     */
    isOpened(): boolean;
    /**
     * Ensures the database is initialized.
     * @returns
     */
    private ensureDB;
    /**
     * Processes a callback with database checks (not destroyed, initialised).
     * @param callback a callback that takes the IDBDatabase and returns a promise
     * @returns
     */
    private _processWithCheck;
    private untrackDatabaseInstance;
    /**
     * Closes the database and removes it from active instances.
     */
    private closeDatabase;
    /**
     * Retrieves the value associated with the specified key.
     * @param key The key to retrieve from the store.
     * @returns A promise that resolves to the value associated with the key, or undefined if not found.
     */
    get(key: string): Promise<T | undefined>;
    /**
     * Stores a value with the specified key.
     * @param key The key to associate with the value.
     * @param value The value to store.
     * @returns A promise that resolves when the operation is complete.
     */
    set(key: string, value: T): Promise<void>;
    /**
     * Deletes the value associated with the specified key.
     * @param key The key to delete from the store.
     * @returns A promise that resolves when the operation is complete.
     */
    delete(key: string): Promise<void>;
    /**
     * Retrieves an array of keys within the specified range.
     * @param from The lower bound of the key range.
     * @param to The upper bound of the key range.
     * @param count The maximum number of keys to retrieve.
     * @returns A promise that resolves to an array of keys within the specified range.
     */
    keys(from?: string | undefined, to?: string | undefined, count?: number | undefined): Promise<string[]>;
    /**
     * Retrieves an array of keys matching the specified query.
     * @param query The query to match the keys against.
     * @param count The maximum number of keys to retrieve.
     * @returns A promise that resolves to an array of keys matching the query.
     */
    keysIDB(query?: IDBValidKey | IDBKeyRange, count?: number): Promise<IDBValidKey[]>;
    /**
     * Clears all key-value pairs in the store.
     * @returns A promise that resolves when the store is cleared.
     */
    clear(): Promise<void>;
    /**
     * Closes the database and removes it from active instances.
     * @returns void.
     */
    close(): void;
    /**
     * Destroys the database and removes all data.
     * Note: This also closes the database if it is open.
     * @returns A promise that resolves when the database is destroyed.
     */
    destroy(): Promise<void>;
    /**
     * Begins a transaction and executes the provided callback within the transaction context.
     * @param callback - The callback function to execute within the transaction.
     * @returns A promise that resolves when the transaction is complete.
     * Note: Nested transactions are not supported.
     * Transaction will be automatically committed unless aborted before the event loop runs.
     */
    beginTransaction(callback: (tx: SimpleStoreTransaction<T>) => void | Promise<void>): Promise<void>;
    commit(): void;
    abort(): void;
}
