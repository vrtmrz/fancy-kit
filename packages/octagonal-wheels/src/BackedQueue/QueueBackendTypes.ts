import { QueueKey, QueueKeyOnProcess } from "./BackedQueueTypes";

export const ERROR_TRANSACTION_NOT_SUPPORTED = "Backend does not support transactions or is already in transaction";

/**
 * Represents a base interface for a backend store that manages queue items.
 *
 * @template T - The type of items stored in the queue.
 */
export interface QueueBackendBase<T> {
    /**
     * Sets an item in the queue associated with the specified key.
     *
     * @param key - The key associated with the queue item.
     * @param item - The item to be stored in the queue.
     * @returns A promise that resolves when the item has been set.
     */
    setQueueItem(key: QueueKey, item: T): Promise<void>;

    /**
     * Retrieves a queued item associated with the specified key.
     *
     * @param key - The key associated with the queued item.
     * @returns A promise that resolves to the queued item, or undefined if not found.
     */
    getQueuedItem(key: QueueKey): Promise<T | undefined>;

    /**
     * Deletes a queued item associated with the specified key.
     *
     * @param key - The key associated with the queued item to be deleted.
     * @returns A promise that resolves when the item has been deleted.
     */
    deleteQueueItem(key: QueueKey): Promise<void>;

    /**
     * Sets an item as a processing item associated with the specified key.
     *
     * @param key - The key associated with the processing item.
     * @param item - The item to be set as processing.
     * @returns A promise that resolves when the item has been set.
     */
    setProcessingItem(key: QueueKeyOnProcess, item: T): Promise<void>;

    /**
     * Retrieves a processing item associated with the specified key.
     *
     * @param key - The key associated with the processing item.
     * @returns A promise that resolves to the processing item, or undefined if not found.
     */
    getProcessingItem(key: QueueKeyOnProcess): Promise<T | undefined>;

    /**
     * Deletes a processing item associated with the specified key.
     *
     * @param key - The key associated with the processing item to be deleted.
     * @returns A promise that resolves when the item has been deleted.
     */
    deleteProcessingItem(key: QueueKeyOnProcess): Promise<void>;

    /**
     * Retrieves keys within the specified range, optionally limiting the number of results.
     *
     * @param from - The starting key (inclusive).
     * @param to - The ending key (inclusive).
     * @param count - The maximum number of keys to retrieve.
     * @returns A promise that resolves to an array of keys.
     */
    keys(from: string | undefined, to: string | undefined, count?: number | undefined): Promise<string[]>;

    /**
     * Retrieves the next available queue key.
     *
     * @returns A promise that resolves to the next queue key, or undefined if none is available.
     */
    getNextQueueKey(): Promise<QueueKey | undefined>;

    /**
     * Issues a new queue key.
     *
     * @returns The newly issued queue key.
     */
    issueNewQueueKey(): QueueKey;

    /**
     * A prefix used for queue items.
     * This prefix should not be included in processingPrefix.
     */
    readonly prefix: string;

    /**
     * A prefix used for processing items.
     * This prefix should not be included in prefix.
     */
    readonly processingPrefix: string;
}

/**
 * Represents a transaction-capable backend store for managing queue items.
 */
export type QueueBackendTransaction<T> = QueueBackendBase<T>;

/**
 * Represents a backend store with transaction support for managing queue items.
 */
export interface QueueBackendWithTransaction<T> extends QueueBackendBase<T> {
    /**
     * Performs the callback within a transaction.
     * @param callback - The function to be performed within the transaction.
     * @returns A promise that resolves to the callback result.
     * Most backends support transactions confined to a single microtask or a short chain limited to database operations.
     * Yielding control (for example, awaiting non-storage work or timers) risks inconsistent or partially applied data.
     * Keep transactional logic brief and focused on storage operations.
     */
    atomic<U>(callback: (store: QueueBackendTransaction<T>) => Promise<U>): Promise<U>;
}
