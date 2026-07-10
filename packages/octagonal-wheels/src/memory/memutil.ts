// Due to strict constraints, they may have to be hidden once in order to save memory,

import type { SimpleStore } from "../databases/SimpleStoreBase.ts";

export const PREFIX_TRENCH = "trench";
export const PREFIX_EPHEMERAL = "ephemeral";
export const PREFIX_PERMANENT = "permanent";
let idx = 0;
let series = `${Date.now()}`;
function generateId(prefix: string) {
    idx++;
    if (idx > 10000) {
        series = `${Date.now()}`;
        idx = 0;
    }
    const paddedIdx = idx + 10000000;
    return `${PREFIX_TRENCH}-${prefix}-${series}-${paddedIdx}`;
}

function createRange(prefix: string, series: string) {
    return [`${PREFIX_TRENCH}-${prefix}-${series}-`, `${PREFIX_TRENCH}-${prefix}-${series}.`];
}
function createId(prefix: string, series: string, idx: number) {
    const paddedIdx = idx + 10000000;
    return `${PREFIX_TRENCH}-${prefix}-${series}-${paddedIdx}`;
}

const indexes = new Map<string, number>();
export type Evacuated<T> = () => Promise<T>;

const inProgress = new Set<string>();
const failed = new Map<string, number>();

type CommittableDequeuedValue<T> = Promise<
    | {
          key: string;
          value: T;
          cancelCount: number;
          pendingItems: number;
          commit: () => Promise<void>;
          cancel: () => void;
      }
    | undefined
>;
/**
 * Represents a Trench, which is a memory utility class for managing data storage.
 */
export class Trench {
    _db: SimpleStore<any>;
    _flushTask: Promise<void> | undefined = undefined;
    /**
     * Constructs a new instance of the Trench class.
     * @param db The SimpleStore instance used for storing data.
     * @param flushExistItems Determines whether to flush existing items from the database.
     */
    constructor(db: SimpleStore<any>, flushExistItems = true) {
        this._db = db;
        if (flushExistItems) {
            this._flushTask = (async () => {
                const keys = await db.keys(
                    `${PREFIX_TRENCH}-${PREFIX_EPHEMERAL}`,
                    `${PREFIX_TRENCH}-${PREFIX_EPHEMERAL}.`
                );
                for (const key of keys) {
                    await db.delete(key);
                }
            })();
        }
    }

    /**
     * Deletes all ephemeral keys from the SimpleStore.
     * @returns {Promise<void>} A promise that resolves when all ephemeral keys are deleted.
     */
    async eraseAllEphemerals() {
        const keys = await this._db.keys(
            `${PREFIX_TRENCH}-${PREFIX_EPHEMERAL}`,
            `${PREFIX_TRENCH}-${PREFIX_EPHEMERAL}.`
        );
        for (const key of keys) {
            await this._db.delete(key);
        }
    }

    /**
     * Deletes all permanences from the SimpleStore.
     * @returns {Promise<void>} A promise that resolves when all permanences are deleted.
     */
    async eraseAllPermanences() {
        const keys = await this._db.keys(
            `${PREFIX_TRENCH}-${PREFIX_PERMANENT}`,
            `${PREFIX_TRENCH}-${PREFIX_PERMANENT}.`
        );
        for (const key of keys) {
            await this._db.delete(key);
        }
    }

    concealing: Map<string, any> = new Map<string, any>();
    /**
     * Conceals an object by generating a unique key and storing the object in SimpleStore.
     * The object can later be retrieved using the generated key.
     * @param obj - The object to be concealed.
     * @returns The generated key used to retrieve the concealed object.
     */
    conceal<T>(obj: T): string {
        const key = generateId(PREFIX_EPHEMERAL);
        // Race conditions should only be addressed in advance.
        this.concealing.set(key, obj);
        void this._db.set(key, obj).then(async (e) => {
            if (this.concealing.has(key)) {
                this.concealing.delete(key);
            } else {
                // If not in time
                await this._db.delete(key);
            }
        });
        return key;
    }
    /**
     * Dispose concealed object.
     * @param key - The key to bury.
     */
    async bury(key: string) {
        // TODO: TEST, This is untested yet
        if (this.concealing.has(key)) {
            this.concealing.delete(key);
        }
        await this._db.delete(key);
    }

    /**
     * Exposes a concealed object by its key.
     * The object is removed from the database after being exposed.
     * @param key - The key of the concealed object.
     * @returns The exposed object.
     */
    async expose<T>(key: string): Promise<T | undefined> {
        if (this.concealing.has(key)) {
            const value = this.concealing.get(key);
            this.concealing.delete(key);
            return value;
        }
        const obj = (await this._db.get(key)) as T;
        await this._db.delete(key);
        return obj;
    }
    _evacuate<T>(storeTask: Promise<void>, key: string): Evacuated<T> {
        return async (): Promise<T> => {
            if (this._flushTask) {
                await this._flushTask;
                this._flushTask = undefined;
            }
            await storeTask;
            const item = (await this._db.get(key)) as T;
            await this._db.delete(key);
            return item;
        };
    }

    /**
     * Evacuates a promise by storing its resolved value in the database and returning an `Evacuated` object.
     * @param task The promise to be evacuated.
     * @returns An `Evacuated` object representing the evacuated promise.
     */
    evacuatePromise<T>(task: Promise<T>): Evacuated<T> {
        const key = generateId(PREFIX_EPHEMERAL);
        const storeTask = (async () => {
            const data = await task;
            await this._db.set(key, data);
        })();
        return this._evacuate(storeTask, key);
    }
    /**
     * Evacuates an object by storing it in the database and returning an `Evacuated` object.
     * If the object is a Promise, it is first evacuated using the `evacuatePromise` method.
     * @param obj - The object to be evacuated.
     * @returns An `Evacuated` object representing the evacuated object.
     */
    evacuate<T>(obj: T): Evacuated<T> {
        if (obj instanceof Promise) return this.evacuatePromise(obj);
        const key = generateId(PREFIX_EPHEMERAL);
        const storeTask = this._db.set(key, obj);
        return this._evacuate(storeTask, key);
    }
    async _queue<T>(type: string, key: string, obj: T, index: number | undefined) {
        if (index === undefined) {
            // Only in ephemeral, we can do this.
            index = indexes.get(key) ?? 0;
            indexes.set(key, index + 1);
        }
        // is actually only need ephemeral?
        const storeKey = createId(type, key, index);
        await this._db.set(storeKey, obj);
    }
    async _dequeue<T>(type: string, key: string): Promise<T | undefined> {
        const range = createRange(type, key);
        const keys = (await this._db.keys(range[0], range[1])).filter((e) => !inProgress.has(e));
        if (keys.length === 0) return undefined;
        return await this.expose<T>(keys[0]);
    }
    async _dequeueWithCommit<T>(type: string, key: string): CommittableDequeuedValue<T> {
        const range = createRange(type, key);
        const keysAll = await this._db.keys(range[0], range[1]);
        const keys = keysAll.filter((e) => !inProgress.has(e));
        if (keys.length === 0) return undefined;
        const storeKey = keys[0];
        inProgress.add(storeKey);
        const previousFailed = failed.get(storeKey) || 0;
        const value = (await this._db.get(storeKey)) as T;
        return {
            key: storeKey,
            value,
            cancelCount: previousFailed,
            pendingItems: keysAll.length - 1,
            commit: async () => {
                await this._db.delete(storeKey);
                failed.delete(storeKey);
                inProgress.delete(storeKey);
            },
            cancel: () => {
                failed.set(storeKey, (failed.get(storeKey) || 0) + 1);
                inProgress.delete(storeKey);
            },
        };
    }

    /**
     * Queues an object with the specified key and optional index.
     *
     * @template T - The type of the object being queued.
     * @param {string} key - The key to associate with the object.
     * @param {T} obj - The object to be queued.
     * @param {number} [index] - The optional index at which to insert the object in the queue.
     * @returns {Promise<void>} A promise that resolves when the object is queued.
     */
    queue<T>(key: string, obj: T, index?: number): Promise<void> {
        return this._queue<T>(PREFIX_EPHEMERAL, key, obj, index);
    }
    /**
     * Removes and returns the first element from the queue associated with the specified key.
     *
     * @template T - The type of elements in the queue.
     * @param key - The key associated with the queue.
     * @returns The first element from the queue, or undefined if the queue is empty.
     */
    dequeue<T>(key: string): Promise<T | undefined> {
        return this._dequeue<T>(PREFIX_EPHEMERAL, key);
    }
    /**
     * Dequeues an item. you can commit or cancel the dequeue operation.
     *
     * @template T - The type of the item being dequeued.
     * @param key - The key of the item to dequeue.
     * @returns The dequeued item.
     */
    dequeueWithCommit<T>(key: string): CommittableDequeuedValue<T> {
        return this._dequeueWithCommit<T>(PREFIX_EPHEMERAL, key);
    }

    /**
     * Queues an object permanently in the SimpleStore.
     *
     * @template T - The type of the object being queued.
     * @param key - The key to associate with the object.
     * @param obj - The object to be queued.
     * @param index - Optional. The index at which to insert the object in the queue.
     * @returns The updated queue.
     */
    queuePermanent<T>(key: string, obj: T, index?: number): Promise<void> {
        return this._queue<T>(PREFIX_PERMANENT, key, obj, index);
    }
    /**
     * Dequeues an permanent item from the SimpleStore with the specified key.
     *
     * @template T - The type of the item to dequeue.
     * @param key - The key of the item to dequeue.
     * @returns The dequeued item.
     */
    dequeuePermanent<T>(key: string): Promise<T | undefined> {
        return this._dequeue<T>(PREFIX_PERMANENT, key);
    }
    /**
     * Dequeues an permanent item from the SimpleStore. we can commit or cancel the dequeue operation.
     *
     * @template T - The type of the item being dequeued.
     * @param key - The key of the item to dequeue.
     * @returns The dequeued item.
     */
    dequeuePermanentWithCommit<T>(key: string): CommittableDequeuedValue<T> {
        return this._dequeueWithCommit<T>(PREFIX_PERMANENT, key);
    }
}
