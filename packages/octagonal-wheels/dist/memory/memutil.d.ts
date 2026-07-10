import type { SimpleStore } from "../databases/SimpleStoreBase.ts";
export declare const PREFIX_TRENCH = "trench";
export declare const PREFIX_EPHEMERAL = "ephemeral";
export declare const PREFIX_PERMANENT = "permanent";
export type Evacuated<T> = () => Promise<T>;
type CommittableDequeuedValue<T> = Promise<{
    key: string;
    value: T;
    cancelCount: number;
    pendingItems: number;
    commit: () => Promise<void>;
    cancel: () => void;
} | undefined>;
/**
 * Represents a Trench, which is a memory utility class for managing data storage.
 */
export declare class Trench {
    _db: SimpleStore<any>;
    _flushTask: Promise<void> | undefined;
    /**
     * Constructs a new instance of the Trench class.
     * @param db The SimpleStore instance used for storing data.
     * @param flushExistItems Determines whether to flush existing items from the database.
     */
    constructor(db: SimpleStore<any>, flushExistItems?: boolean);
    /**
     * Deletes all ephemeral keys from the SimpleStore.
     * @returns {Promise<void>} A promise that resolves when all ephemeral keys are deleted.
     */
    eraseAllEphemerals(): Promise<void>;
    /**
     * Deletes all permanences from the SimpleStore.
     * @returns {Promise<void>} A promise that resolves when all permanences are deleted.
     */
    eraseAllPermanences(): Promise<void>;
    concealing: Map<string, any>;
    /**
     * Conceals an object by generating a unique key and storing the object in SimpleStore.
     * The object can later be retrieved using the generated key.
     * @param obj - The object to be concealed.
     * @returns The generated key used to retrieve the concealed object.
     */
    conceal<T>(obj: T): string;
    /**
     * Dispose concealed object.
     * @param key - The key to bury.
     */
    bury(key: string): Promise<void>;
    /**
     * Exposes a concealed object by its key.
     * The object is removed from the database after being exposed.
     * @param key - The key of the concealed object.
     * @returns The exposed object.
     */
    expose<T>(key: string): Promise<T | undefined>;
    _evacuate<T>(storeTask: Promise<void>, key: string): Evacuated<T>;
    /**
     * Evacuates a promise by storing its resolved value in the database and returning an `Evacuated` object.
     * @param task The promise to be evacuated.
     * @returns An `Evacuated` object representing the evacuated promise.
     */
    evacuatePromise<T>(task: Promise<T>): Evacuated<T>;
    /**
     * Evacuates an object by storing it in the database and returning an `Evacuated` object.
     * If the object is a Promise, it is first evacuated using the `evacuatePromise` method.
     * @param obj - The object to be evacuated.
     * @returns An `Evacuated` object representing the evacuated object.
     */
    evacuate<T>(obj: T): Evacuated<T>;
    _queue<T>(type: string, key: string, obj: T, index: number | undefined): Promise<void>;
    _dequeue<T>(type: string, key: string): Promise<T | undefined>;
    _dequeueWithCommit<T>(type: string, key: string): CommittableDequeuedValue<T>;
    /**
     * Queues an object with the specified key and optional index.
     *
     * @template T - The type of the object being queued.
     * @param {string} key - The key to associate with the object.
     * @param {T} obj - The object to be queued.
     * @param {number} [index] - The optional index at which to insert the object in the queue.
     * @returns {Promise<void>} A promise that resolves when the object is queued.
     */
    queue<T>(key: string, obj: T, index?: number): Promise<void>;
    /**
     * Removes and returns the first element from the queue associated with the specified key.
     *
     * @template T - The type of elements in the queue.
     * @param key - The key associated with the queue.
     * @returns The first element from the queue, or undefined if the queue is empty.
     */
    dequeue<T>(key: string): Promise<T | undefined>;
    /**
     * Dequeues an item. you can commit or cancel the dequeue operation.
     *
     * @template T - The type of the item being dequeued.
     * @param key - The key of the item to dequeue.
     * @returns The dequeued item.
     */
    dequeueWithCommit<T>(key: string): CommittableDequeuedValue<T>;
    /**
     * Queues an object permanently in the SimpleStore.
     *
     * @template T - The type of the object being queued.
     * @param key - The key to associate with the object.
     * @param obj - The object to be queued.
     * @param index - Optional. The index at which to insert the object in the queue.
     * @returns The updated queue.
     */
    queuePermanent<T>(key: string, obj: T, index?: number): Promise<void>;
    /**
     * Dequeues an permanent item from the SimpleStore with the specified key.
     *
     * @template T - The type of the item to dequeue.
     * @param key - The key of the item to dequeue.
     * @returns The dequeued item.
     */
    dequeuePermanent<T>(key: string): Promise<T | undefined>;
    /**
     * Dequeues an permanent item from the SimpleStore. we can commit or cancel the dequeue operation.
     *
     * @template T - The type of the item being dequeued.
     * @param key - The key of the item to dequeue.
     * @returns The dequeued item.
     */
    dequeuePermanentWithCommit<T>(key: string): CommittableDequeuedValue<T>;
}
export {};
