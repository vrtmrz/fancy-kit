import type { QueueKey, QueueKeyOnProcess } from "./BackedQueueTypes.ts";
import type { QueueBackendWithTransaction, QueueBackendTransaction } from "./QueueBackendTypes.ts";

/**
 * A simple in-memory backend store for testing purposes.
 * @template T The type of items in the queue.
 */
export class QueueBackendMemory<T> implements QueueBackendWithTransaction<T> {
    private _queueMap: Map<QueueKey, T> = new Map();
    // private _processingMap: Map<QueueKeyOnProcess, T> = new Map();
    protected readonly _name: string;
    protected readonly _basePrefix: string;

    protected _startupTime = Date.now();
    protected _sessionRandom = Math.floor(Math.random() * 36 * 36);
    protected _incrementalId = 0;
    protected _shouldBypassKey: (key: string) => boolean = () => false;
    get prefix() {
        return this._basePrefix + "w-" + this._name + "-";
    }
    get processingPrefix() {
        return this._basePrefix + "r-" + this._name + "-";
    }

    constructor(
        name: string,
        basePrefix: string,
        shouldBypass?: (key: string) => boolean,
        base?: {
            queueMapBase: Map<QueueKey, T>;
            startupTime: number;
            sessionRandom: number;
            incrementalId: number;
        }
    ) {
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
    private _getQueueKey(key: QueueKey): string {
        return this.prefix + key;
    }
    private _getProcessingKey(key: QueueKeyOnProcess): string {
        return this.processingPrefix + key;
    }
    getQueuedItem(key: QueueKey): Promise<T | undefined> {
        const xKey = this._getQueueKey(key);
        return Promise.resolve(this._queueMap.get(xKey));
    }
    setQueueItem(key: QueueKey, item: T): Promise<void> {
        const xKey = this._getQueueKey(key);
        this._queueMap.set(xKey, item);
        return Promise.resolve();
    }
    deleteQueueItem(key: QueueKey): Promise<void> {
        const xKey = this._getQueueKey(key);
        this._queueMap.delete(xKey);
        return Promise.resolve();
    }
    getProcessingItem(key: QueueKeyOnProcess): Promise<T | undefined> {
        const xKey = this._getProcessingKey(key);
        return Promise.resolve(this._queueMap.get(xKey));
    }
    setProcessingItem(key: QueueKeyOnProcess, item: T): Promise<void> {
        const xKey = this._getProcessingKey(key);
        this._queueMap.set(xKey, item);
        return Promise.resolve();
    }
    deleteProcessingItem(key: QueueKeyOnProcess): Promise<void> {
        const xKey = this._getProcessingKey(key);
        this._queueMap.delete(xKey);
        return Promise.resolve();
    }
    // * Atomic operation support
    // Creates a new transaction instance, passes it to the callback, and upon completion, overwrites changes back
    async atomic<U>(callback: (store: QueueBackendTransaction<T>) => Promise<U>): Promise<U> {
        const tx = new QueueBackendMemory<T>(this._name, this._basePrefix, this._shouldBypassKey, {
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

    keys(from: string | undefined, to: string | undefined, count?: number | undefined): Promise<string[]> {
        const result: string[] = [];
        const keys = [...this._queueMap.keys()].sort();
        for (const key of keys) {
            if (from && key.localeCompare(from) < 0) continue;
            if (to && key.localeCompare(to) > 0) continue;
            result.push(key);
            if (count !== undefined && result.length >= count) {
                break;
            }
        }
        return Promise.resolve(result);
    }
    async getNextQueueKey(): Promise<QueueKey | undefined> {
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

    issueNewQueueKey(): QueueKey {
        const p = this._startupTime.toString(36).padStart(8, "0");
        const rand = this._sessionRandom.toString(36).padStart(2, "0");
        const i = (this._incrementalId++).toString(36).padStart(5, "0");
        return this.prefix + p + "-" + rand + "-" + i;
    }
}
