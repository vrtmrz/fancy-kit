/**
 * A simple in-memory backend store for testing purposes.
 * @template T The type of items in the queue.
 */
class QueueBackendMemory {
    get prefix() {
        return this._basePrefix + "w-" + this._name + "-";
    }
    get processingPrefix() {
        return this._basePrefix + "r-" + this._name + "-";
    }
    constructor(name, basePrefix, shouldBypass, base) {
        Object.defineProperty(this, "_queueMap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        // private _processingMap: Map<QueueKeyOnProcess, T> = new Map();
        Object.defineProperty(this, "_name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_basePrefix", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_startupTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: Date.now()
        });
        Object.defineProperty(this, "_sessionRandom", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: Math.floor(Math.random() * 36 * 36)
        });
        Object.defineProperty(this, "_incrementalId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "_shouldBypassKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => false
        });
        this._name = name;
        this._basePrefix = basePrefix;
        if (base) {
            this._queueMap = new Map([...base.queueMapBase.entries()]);
            this._startupTime = base.startupTime;
            this._sessionRandom = base.sessionRandom;
            this._incrementalId = base.incrementalId;
        }
        if (shouldBypass) {
            this._shouldBypassKey = shouldBypass;
        }
    }
    _getQueueKey(key) {
        return this.prefix + key;
    }
    _getProcessingKey(key) {
        return this.processingPrefix + key;
    }
    getQueuedItem(key) {
        const xKey = this._getQueueKey(key);
        return Promise.resolve(this._queueMap.get(xKey));
    }
    setQueueItem(key, item) {
        const xKey = this._getQueueKey(key);
        this._queueMap.set(xKey, item);
        return Promise.resolve();
    }
    deleteQueueItem(key) {
        const xKey = this._getQueueKey(key);
        this._queueMap.delete(xKey);
        return Promise.resolve();
    }
    getProcessingItem(key) {
        const xKey = this._getProcessingKey(key);
        return Promise.resolve(this._queueMap.get(xKey));
    }
    setProcessingItem(key, item) {
        const xKey = this._getProcessingKey(key);
        this._queueMap.set(xKey, item);
        return Promise.resolve();
    }
    deleteProcessingItem(key) {
        const xKey = this._getProcessingKey(key);
        this._queueMap.delete(xKey);
        return Promise.resolve();
    }
    // * Atomic operation support
    // Creates a new transaction instance, passes it to the callback, and upon completion, overwrites changes back
    async atomic(callback) {
        const tx = new QueueBackendMemory(this._name, this._basePrefix, this._shouldBypassKey, {
            queueMapBase: this._queueMap,
            startupTime: this._startupTime,
            sessionRandom: this._sessionRandom,
            incrementalId: this._incrementalId,
        });
        const result = await callback(tx);
        this._queueMap = new Map([...tx._queueMap.entries()]);
        // incrementalId needs to be updated too
        this._incrementalId = tx._incrementalId;
        return result;
    }
    keys(from, to, count) {
        const result = [];
        const keys = [...this._queueMap.keys()].sort();
        for (const key of keys) {
            if (from && key.localeCompare(from) < 0)
                continue;
            if (to && key.localeCompare(to) > 0)
                continue;
            result.push(key);
            if (count !== undefined && result.length >= count) {
                break;
            }
        }
        return Promise.resolve(result);
    }
    async getNextQueueKey() {
        let currentKey = this.prefix;
        const fetchPageSize = 10;
        while (true) {
            const keys = await this.keys(currentKey, this.prefix + "\uffff", fetchPageSize);
            for (const key of keys) {
                if (this._shouldBypassKey(key)) {
                    continue;
                }
                return key.substring(this.prefix.length);
            }
            if (keys.length < fetchPageSize) {
                break;
            }
            currentKey = keys[keys.length - 1] + "\uffff";
        }
        return undefined;
    }
    issueNewQueueKey() {
        const p = this._startupTime.toString(36).padStart(8, "0");
        const rand = this._sessionRandom.toString(36).padStart(2, "0");
        const i = (this._incrementalId++).toString(36).padStart(5, "0");
        return this.prefix + p + "-" + rand + "-" + i;
    }
}

export { QueueBackendMemory };
//# sourceMappingURL=QueueBackendMemory.js.map
