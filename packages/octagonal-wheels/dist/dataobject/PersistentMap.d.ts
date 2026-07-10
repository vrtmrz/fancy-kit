/**
 * The Map, which can keep the data.
 */
/**
 * Represents a persistent map that stores key-value pairs in the browser's local storage.
 * The map is automatically saved to the local storage whenever a change is made with some delays.
 *
 * @template T - The type of values stored in the map.
 */
export declare class PersistentMap<T> {
    _setCount: number;
    _map: Map<string, T>;
    _key: string;
    flush(): void;
    _save(): void;
    _load(suppliedEntries?: readonly (readonly [string, T])[]): Promise<void>;
    _queueSave(): void;
    delete(key: string): boolean;
    has(key: string): boolean;
    set(key: string, value: T): this;
    clear(): void;
    get(key: string, defValue?: T): T | undefined;
    constructor(key: string, entries?: readonly (readonly [string, T])[]);
}
