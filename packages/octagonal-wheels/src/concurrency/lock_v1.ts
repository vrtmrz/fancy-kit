/* eslint-disable */
// Obsolete file, use lock_v2.ts instead
/**
 * @deprecated This module is deprecated and will be removed in the future.
 * use lock_v2.ts instead.
 */
import { fireAndForget, promiseWithResolvers, yieldNextMicrotask } from "../promises.ts";

type Task<T> = () => Promise<T> | T;
type Queue<T> = {
    key: string | symbol;
    task: Task<T>;
    resolver: (result: T) => void;
    rejector: (reason?: any) => void;
    next?: Queue<T>;
    isRunning?: boolean;
    isFinished?: boolean;
};

const queueTails = new Map<string | symbol, Queue<any> | undefined>();
/**
 * @deprecated This module is deprecated and will be removed in the future.
 * use lock_v2.ts instead.
 */
async function performTask<T>(queue: Queue<T>) {
    if (queue.isRunning) {
        // The same queue has been started
        return;
    }
    try {
        queue.isRunning = true;
        const ret = await queue.task();
        queue.resolver(ret);
    } catch (ex) {
        queue.rejector(ex);
    } finally {
        const next = queue.next;
        queue.isFinished = true;
        // This makes non-sense, we have make the latest queue while enqueuing.
        if (next) {
            fireAndForget(async () => {
                await yieldNextMicrotask(), performTask(next);
            });
        } else {
            queueTails.delete(queue.key);
        }
    }
    return;
}

// --- asynchronous execution / locking utilities

type QueueOptions = {
    swapIfExist?: boolean;
    shareResult?: boolean;
};

function _enqueue<T>(key: string | symbol, task: Task<T>, { swapIfExist, shareResult }: QueueOptions = {}): Promise<T> {
    const t = promiseWithResolvers<T>();
    const resolver = t.resolve;
    const rejector = t.reject;

    const newQueue: Queue<T> = {
        task,
        resolver,
        rejector,
        key,
    };

    const prev = queueTails.get(key);
    if (prev === undefined) {
        queueTails.set(key, newQueue);
    } else {
        const current = prev as Queue<T>;
        queueTails.set(key, newQueue);
        current.next = newQueue;
        if (swapIfExist) {
            // Force cancel previous one
            current.rejector(new Error("Cancelled"));
        }
    }
    if (!prev || prev.isFinished) {
        fireAndForget(() => performTask(newQueue));
    }
    return t.promise;
}

/**
 * Run tasks one by one in their group.
 * @param key key of the group
 * @param proc process to run
 * @returns result of the process
 * @deprecated This module is deprecated and will be removed in the future.
 * use lock_v2.ts instead.
 */
export function serialized<T>(key: string | symbol, proc: Task<T>): Promise<T> {
    return _enqueue(key, proc);
}

/**
 * If free, run task and return the result (Same as serialized).
 * If any process has running, share the result.
 * @param key key of the group
 * @param proc process to run
 * @deprecated This module is deprecated and will be removed in the future.
 * use lock_v2.ts instead.
 */
export function shareRunningResult<T>(key: string | symbol, proc: Task<T>): Promise<T> {
    const current = queueTails.get(key);
    if (!current) return _enqueue(key, proc);
    let oldResolver = current.resolver;
    let oldRejector = current.rejector;

    const resultP = promiseWithResolvers<T>();

    // Inject hooked handler
    current.resolver = (result) => {
        oldResolver?.(result);
        resultP.resolve(result);
    };
    current.rejector = (result) => {
        oldRejector?.(result);
        resultP.reject(result);
    };
    resultP.promise.finally(() => {
        oldResolver = undefined!;
        oldRejector = undefined!;
    });
    return resultP.promise;
}

/**
 * Skips the execution of a task if it is already duplicated.
 *
 * @param key - The key to identify the task.
 * @param proc - The task to be executed.
 * @returns A promise that resolves to the result of the task, or `null` if the task is duplicated.
 * @deprecated This module is deprecated and will be removed in the future.
 * use lock_v2.ts instead.
 */
export function skipIfDuplicated<T>(key: string | symbol, proc: Task<T>): Promise<T | null> {
    if (queueTails.get(key) !== undefined) return Promise.resolve(null);
    return _enqueue(key, proc);
}

const waitingProcess = new Map<string, () => Promise<any>>();

/**
 * Schedules a process to be executed once if it is not already running.
 * If the process is already running, it will be added to the waiting queue. An existing waiting process will be replaced.
 *
 * @param key - The key used to identify the process.
 * @param proc - The process to be executed.
 * @returns A Promise that resolves once the process has been scheduled.
 * @deprecated This module is deprecated and will be removed in the future.
 * use lock_v2.ts instead.
 */
export async function scheduleOnceIfDuplicated<T>(key: string, proc: () => Promise<T>): Promise<void> {
    if (isLockAcquired(key)) {
        waitingProcess.set(key, proc);
        return;
    }
    await serialized(key, proc);
    if (waitingProcess.has(key)) {
        const nextProc = waitingProcess.get(key);
        waitingProcess.delete(key);
        scheduleOnceIfDuplicated(key, nextProc as () => Promise<T>);
    }
}
/**
 * Checks if a lock is acquired for the given key.
 * @param key - The key to check for lock acquisition.
 * @returns `true` if the lock is acquired, `false` otherwise.
 * @deprecated This module is deprecated and will be removed in the future.
 * use lock_v2.ts instead.
 */
export function isLockAcquired(key: string): boolean {
    return queueTails.get(key) !== undefined;
}
