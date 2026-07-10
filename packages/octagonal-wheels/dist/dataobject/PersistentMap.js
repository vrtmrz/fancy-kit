import { scheduleTask } from '../concurrency/task.js';

/**
 * The Map, which can keep the data.
 */
const YieldOperationNumbers = 100;
/**
 * Represents a persistent map that stores key-value pairs in the browser's local storage.
 * The map is automatically saved to the local storage whenever a change is made with some delays.
 *
 * @template T - The type of values stored in the map.
 */
class PersistentMap {
    flush() {
        this._save();
    }
    _save() {
        localStorage.setItem(this._key, JSON.stringify([...this._map.entries()]));
    }
    _load(suppliedEntries = []) {
        try {
            const savedSource = localStorage.getItem(this._key) ?? "";
            const sourceToParse = savedSource === "" ? "[]" : savedSource;
            const obj = JSON.parse(sourceToParse);
            this._map = new Map([...obj, ...suppliedEntries]);
        }
        catch (ex) {
            console.log(`Map read error : ${this._key}`);
            console.dir(ex);
            this._map = new Map([...suppliedEntries]);
        }
        return Promise.resolve();
    }
    _queueSave() {
        this._setCount--;
        // If we had processed too many operation while in the short time, save once.
        if (this._setCount < 0) {
            this._setCount = YieldOperationNumbers;
            scheduleTask(`save-map-${this._key}`, 0, () => this._save());
        }
        // Or schedule saving.
        scheduleTask(`save-map-${this._key}`, 150, () => this._save());
    }
    delete(key) {
        const ret = this._map.delete(key);
        this._queueSave();
        return ret;
    }
    has(key) {
        return this._map.has(key);
    }
    set(key, value) {
        this._map.set(key, value);
        this._queueSave();
        return this;
    }
    clear() {
        this._map = new Map();
        this._save();
    }
    get(key, defValue) {
        const v = this._map.get(key);
        if (v === undefined)
            return defValue;
        return v;
    }
    constructor(key, entries) {
        Object.defineProperty(this, "_setCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: YieldOperationNumbers
        });
        Object.defineProperty(this, "_map", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_key", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._key = key;
        this._map = new Map(entries ?? []);
        void this._load(entries);
    }
}

export { PersistentMap };
//# sourceMappingURL=PersistentMap.js.map
