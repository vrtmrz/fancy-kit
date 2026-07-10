import type { SimpleStoreCRUDSupportTransaction, SimpleStoreTransaction } from "../databases/SimpleStoreBase";
import type { QueueKey, QueueKeyOnProcess } from "./BackedQueueTypes";
import { QueueBackendTransaction, QueueBackendWithTransaction } from "./QueueBackendTypes";
/**
 * Backend store implemented via prefixed namespacing over a SimpleStore.
 * @template T Type of items stored in the queue.
 */
export declare class QueueBackend<T> implements QueueBackendWithTransaction<T> {
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
    get prefix(): string;
    /**
     * Prefix used for items marked as processing.
     */
    get processingPrefix(): string;
    /**
     * Predicate to decide whether a key is bypassed during queue scanning.
     * @protected
     */
    protected _shouldBypassKey: (key: string) => boolean;
    /**
     * Constructs a QueueBackend instance.
     * @param db Backend database instance.
     * @param name Logical name for this queue namespace.
     * @param basePrefix Root prefix applied to all keys.
     * @param shouldBypass Optional predicate to bypass certain keys.
     */
    constructor(db: SimpleStoreCRUDSupportTransaction<T> | SimpleStoreTransaction<T>, name: string, basePrefix: string, shouldBypass?: (key: string) => boolean);
    /**
     * Retrieves a queued item by key.
     * @returns Promise resolving to the item, or undefined if absent.
     */
    getQueuedItem(key: QueueKey): Promise<T | undefined>;
    /**
     * Stores a queued item by key.
     */
    setQueueItem(key: QueueKey, item: T): Promise<void>;
    /**
     * Removes a queued item by key.
     */
    deleteQueueItem(key: QueueKey): Promise<void>;
    /**
     * Retrieves a processing item by key.
     * @returns Promise resolving to the item, or undefined if absent.
     */
    getProcessingItem(key: QueueKeyOnProcess): Promise<T | undefined>;
    /**
     * Stores a processing item by key.
     */
    setProcessingItem(key: QueueKeyOnProcess, item: T): Promise<void>;
    /**
     * Removes a processing item by key.
     */
    deleteProcessingItem(key: QueueKeyOnProcess): Promise<void>;
    /**
     * Performs a series of operations atomically inside a transaction.
     * @param callback Function receiving a transactional queue backend.
     * @returns Result returned by the callback.
     */
    atomic<U>(callback: (store: QueueBackendTransaction<T>) => Promise<U>): Promise<U>;
    /**
     * Retrieves keys in a range.
     * @param from Inclusive start key (optional).
     * @param to Inclusive end key (optional).
     * @param count Maximum number of keys (optional).
     */
    keys(from: string | undefined, to: string | undefined, count?: number | undefined): Promise<string[]>;
    /**
     * Retrieves the next available queue key (without item mutation).
     * Skips bypassed keys.
     * @returns Next queue key, or undefined if none.
     */
    getNextQueueKey(): Promise<QueueKey | undefined>;
    protected _startupTime: number;
    protected _sessionRandom: number;
    protected _incrementalId: number;
    /**
     * Issues a new unique queue key.
     */
    issueNewQueueKey(): QueueKey;
}
