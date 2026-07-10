/**
 * The Map, which can keep the data.
 */

import { scheduleTask } from "../concurrency/task.ts";

const YieldOperationNumbers = 100;

/**
 * Represents a persistent map that stores key-value pairs in the browser's local storage.
 * The map is automatically saved to the local storage whenever a change is made with some delays.
 *
 * @template T - The type of values stored in the map.
 */
export class PersistentMap<T> {
    _setCount = YieldOperationNumbers;
    _map: Map<string, T>;
    _key: string;

    flush(): void {
        this._save();
    }
    _save(): void {
        localStorage.setItem(this._key, JSON.stringify([...this._map.entries()]));
    }
    _load(suppliedEntries: readonly (readonly [string, T])[] = []): Promise<void> {
        try {
            const savedSource = localStorage.getItem(this._key) ?? "";
            const sourceToParse = savedSource === "" ? "[]" : savedSource;
            const obj = JSON.parse(sourceToParse) as [string, T][];
            this._map = new Map([...obj, ...suppliedEntries]);
        } catch (ex) {
            console.log(`Map read error : ${this._key}`);
            console.dir(ex);
            this._map = new Map([...suppliedEntries]);
        }
        return Promise.resolve();
    }
    _queueSave(): void {
        this._setCount--;
        // If we had processed too many operation while in the short time, save once.
        if (this._setCount < 0) {
            this._setCount = YieldOperationNumbers;
            scheduleTask(`save-map-${this._key}`, 0, () => this._save());
        }
        // Or schedule saving.
        scheduleTask(`save-map-${this._key}`, 150, () => this._save());
    }
    delete(key: string): boolean {
        const ret = this._map.delete(key);
        this._queueSave();
        return ret;
    }
    has(key: string): boolean {
        return this._map.has(key);
    }
    set(key: string, value: T): this {
        this._map.set(key, value);
        this._queueSave();
        return this;
    }

    clear(): void {
        this._map = new Map();
        this._save();
    }
    get(key: string, defValue?: T): T | undefined {
        const v = this._map.get(key);
        if (v === undefined) return defValue;
        return v;
    }
    constructor(key: string, entries?: readonly (readonly [string, T])[]) {
        this._key = key;
        this._map = new Map(entries ?? []);
        void this._load(entries);
    }
    // get ready():Promise<boolean>{

    // }
}
