import { promiseWithResolvers } from "../promises.ts";

/** A synchronous or asynchronous operation to execute while holding a lock. */
export type Task<T> = () => Promise<T> | T;

const serializedMap = new Map<string | symbol, Promise<void>>();
const queueCount = new Map<string | symbol, number>();

/**
 * Runs an operation while holding its keyed lock and releases it afterwards.
 *
 * Operations using the same key run in invocation order. The legacy serialized
 * entry shares these locks. Synchronous values and asynchronous results are
 * preserved, and a failed operation does not prevent queued operations running.
 * Reacquiring a key held by the same operation can deadlock.
 *
 * @param key - Shared lock group, identified by a string or symbol.
 * @param proc - Operation to start after earlier operations for this key finish.
 * @returns The operation's result after its lock bookkeeping completes.
 */
export function withLock<T>(key: string | symbol, proc: Task<T>): Promise<T> {
    const prev = serializedMap.get(key);
    const p = promiseWithResolvers<T>();
    queueCount.set(key, (queueCount.get(key) ?? 0) + 1);
    const nextTask = async () => {
        try {
            p.resolve(await proc());
        } catch (ex) {
            p.reject(ex);
        } finally {
            const count = queueCount.get(key)! - 1;
            if (count === 0) {
                serializedMap.delete(key);
                queueCount.delete(key);
            } else {
                queueCount.set(key, count);
            }
        }
    };
    if (prev) {
        const newP = prev.then(() => nextTask());
        serializedMap.set(key, newP);
    } else {
        serializedMap.set(key, nextTask());
    }
    return p.promise;
}


/**
 * Holds each supplied key in order while an operation runs.
 *
 * Keys must be unique and use a consistent order across overlapping operations.
 * No sorting or deduplication is performed. Duplicate keys, inconsistent orders,
 * or reacquiring a held key can deadlock. The input array is not modified.
 * An empty array invokes the operation immediately. All acquired locks are
 * released after success or failure, preserving the result or original failure.
 *
 * @param keys - Unique keys in the caller's shared acquisition order.
 * @param proc - Operation to run after every key has been acquired.
 * @returns The operation's result after releasing the acquired locks.
 */
export async function withLocks<T>(keys: readonly string[], proc: Task<T>): Promise<T> {
    const [key, ...remaining] = keys;
    if (key === undefined) return await proc();
    return await withLock(key, () => withLocks(remaining, proc));
}

/**
 * Reports whether an operation is running or queued for a shared lock key.
 *
 * @param key - Lock group shared by withLock, withLocks, and legacy serialized.
 * @returns Whether the key currently has a running or queued operation.
 */
export function isLockAcquired(key: string | symbol): boolean {
    return (queueCount.get(key) ?? 0) > 0;
}
