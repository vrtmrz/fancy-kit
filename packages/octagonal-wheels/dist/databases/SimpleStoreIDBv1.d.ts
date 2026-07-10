import { type IDBPDatabase } from "idb";
import { SimpleStoreBase } from "./SimpleStoreBase.ts";
/**
 * Represents a simple store using IndexedDB.
 * @template T - The type of the values stored in the store.
 */
export declare class SimpleStoreIDBv1<T> extends SimpleStoreBase<T, IDBPDatabase<any>> {
    name: string;
    constructor(name: string);
    _db?: Promise<IDBPDatabase<any>>;
    get db(): Promise<IDBPDatabase<any>> | undefined;
    initDB(name: string): void;
    get(key: string): Promise<T | undefined>;
    set(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
    keys(from?: string | undefined, to?: string | undefined, count?: number | undefined): Promise<string[]>;
    keysIDB(query?: IDBValidKey | IDBKeyRange, count?: number): Promise<IDBValidKey[]>;
    clear(): Promise<void>;
    close(): void;
    destroy(): Promise<void>;
}
