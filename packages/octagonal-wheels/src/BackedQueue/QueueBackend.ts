import type { SimpleStoreCRUDSupportTransaction, SimpleStoreTransaction } from "../databases/SimpleStoreBase";
import { promiseWithResolvers } from "../promises";
import type { QueueKey, QueueKeyOnProcess } from "./BackedQueueTypes";
import {
    ERROR_TRANSACTION_NOT_SUPPORTED,
    QueueBackendTransaction,
    QueueBackendWithTransaction,
} from "./QueueBackendTypes";

/**
 * Backend store implemented via prefixed namespacing over a SimpleStore.
 * @template T Type of items stored in the queue.
 */
export class QueueBackend<T> implements QueueBackendWithTransaction<T> {
    /**
     * Backend store used for transactional operations.
     * Either SimpleStoreCRUDSupportTransaction or SimpleStoreTransaction.
     * @protected
     */
    protected _backend: SimpleStoreCRUDSupportTransaction<T> | SimpleStoreTransaction<T>;
    /**
     * Name of this backend store.
     * @readonly
     */
    protected readonly _name: string;
    /**
     * Base prefix used to namespace keys.
     * Ensures keys remain distinct and ordered.
     * @protected
     * @readonly
     */
    protected readonly _basePrefix: string;

    /**
     * Prefix used for queued items.
     */
    public get prefix() {
        return this._basePrefix + "w-" + this._name + "-";
    }
    /**
     * Prefix used for items marked as processing.
     */
    public get processingPrefix() {
        return this._basePrefix + "r-" + this._name + "-";
    }

    /**
     * Predicate to decide whether a key is bypassed during queue scanning.
     * @protected
     */
    protected _shouldBypassKey: (key: string) => boolean = () => false;

    /**
     * Constructs a QueueBackend instance.
     * @param db Backend database instance.
     * @param name Logical name for this queue namespace.
     * @param basePrefix Root prefix applied to all keys.
     * @param shouldBypass Optional predicate to bypass certain keys.
     */
    constructor(
        db: SimpleStoreCRUDSupportTransaction<T> | SimpleStoreTransaction<T>,
        name: string,
        basePrefix: string,
        shouldBypass?: (key: string) => boolean
    ) {
        this._backend = db;
        this._name = name;
        this._basePrefix = basePrefix;
        if (shouldBypass) {
            this._shouldBypassKey = shouldBypass;
        }
    }

    /**
     * Retrieves a queued item by key.
     * @returns Promise resolving to the item, or undefined if absent.
     */
    public getQueuedItem(key: QueueKey): Promise<T | undefined> {
        return this._backend.get(this.prefix + key);
    }

    /**
     * Stores a queued item by key.
     */
    public setQueueItem(key: QueueKey, item: T): Promise<void> {
        return this._backend.set(this.prefix + key, item);
    }

    /**
     * Removes a queued item by key.
     */
    public deleteQueueItem(key: QueueKey): Promise<void> {
        return this._backend.delete(this.prefix + key);
    }

    /**
     * Retrieves a processing item by key.
     * @returns Promise resolving to the item, or undefined if absent.
     */
    public getProcessingItem(key: QueueKeyOnProcess): Promise<T | undefined> {
        return this._backend.get(this.processingPrefix + key);
    }

    /**
     * Stores a processing item by key.
     */
    public setProcessingItem(key: QueueKeyOnProcess, item: T): Promise<void> {
        return this._backend.set(this.processingPrefix + key, item);
    }

    /**
     * Removes a processing item by key.
     */
    public deleteProcessingItem(key: QueueKeyOnProcess): Promise<void> {
        return this._backend.delete(this.processingPrefix + key);
    }

    /**
     * Performs a series of operations atomically inside a transaction.
     * @param callback Function receiving a transactional queue backend.
     * @returns Result returned by the callback.
     */
    public async atomic<U>(callback: (store: QueueBackendTransaction<T>) => Promise<U>): Promise<U> {
        const pr = promiseWithResolvers<U>();
        if ("beginTransaction" in this._backend === false) {
            throw new Error(ERROR_TRANSACTION_NOT_SUPPORTED);
        }
        try {
            let result: U;
            await this._backend.beginTransaction(async (txDB) => {
                const tx = new QueueBackend<T>(txDB, this._name, this._basePrefix);
                result = await callback(tx);
            });
            pr.resolve(result!);
        } catch (e) {
            pr.reject(e);
        }
        return pr.promise;
    }

    /**
     * Retrieves keys in a range.
     * @param from Inclusive start key (optional).
     * @param to Inclusive end key (optional).
     * @param count Maximum number of keys (optional).
     */
    public keys(from: string | undefined, to: string | undefined, count?: number | undefined): Promise<string[]> {
        return this._backend.keys(from, to, count);
    }

    /**
     * Retrieves the next available queue key (without item mutation).
     * Skips bypassed keys.
     * @returns Next queue key, or undefined if none.
     */
    public async getNextQueueKey(): Promise<QueueKey | undefined> {
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

    // QueueKey generation parameters
    protected _startupTime = Date.now();
    protected _sessionRandom = Math.floor(Math.random() * 36 * 36);
    protected _incrementalId = 0;

    /**
     * Issues a new unique queue key.
     */
    public issueNewQueueKey(): QueueKey {
        const p = this._startupTime.toString(36).padStart(8, "0");
        const rand = this._sessionRandom.toString(36).padStart(2, "0");
        const i = (this._incrementalId++).toString(36).padStart(5, "0");
        return this.prefix + p + "-" + rand + "-" + i;
    }
}
