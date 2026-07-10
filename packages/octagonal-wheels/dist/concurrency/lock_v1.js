import { promiseWithResolvers, fireAndForget, yieldNextMicrotask } from '../promises.js';

/* eslint-disable */
// Obsolete file, use lock_v2.ts instead
/**
 * @deprecated This module is deprecated and will be removed in the future.
 * use lock_v2.ts instead.
 */
const queueTails = new Map();
/**
 * @deprecated This module is deprecated and will be removed in the future.
 * use lock_v2.ts instead.
 */
async function performTask(queue) {
    if (queue.isRunning) {
        // The same queue has been started
        return;
    }
    try {
        queue.isRunning = true;
        const ret = await queue.task();
        queue.resolver(ret);
    }
    catch (ex) {
        queue.rejector(ex);
    }
    finally {
        const next = queue.next;
        queue.isFinished = true;
        // This makes non-sense, we have make the latest queue while enqueuing.
        if (next) {
            fireAndForget(async () => {
                await yieldNextMicrotask(), performTask(next);
            });
        }
        else {
            queueTails.delete(queue.key);
        }
    }
    return;
}
function _enqueue(key, task, { swapIfExist, shareResult } = {}) {
    const t = promiseWithResolvers();
    const resolver = t.resolve;
    const rejector = t.reject;
    const newQueue = {
        task,
        resolver,
        rejector,
        key,
    };
    const prev = queueTails.get(key);
    if (prev === undefined) {
        queueTails.set(key, newQueue);
    }
    else {
        const current = prev;
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
function serialized(key, proc) {
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
function shareRunningResult(key, proc) {
    const current = queueTails.get(key);
    if (!current)
        return _enqueue(key, proc);
    let oldResolver = current.resolver;
    let oldRejector = current.rejector;
    const resultP = promiseWithResolvers();
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
        oldResolver = undefined;
        oldRejector = undefined;
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
function skipIfDuplicated(key, proc) {
    if (queueTails.get(key) !== undefined)
        return Promise.resolve(null);
    return _enqueue(key, proc);
}
const waitingProcess = new Map();
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
async function scheduleOnceIfDuplicated(key, proc) {
    if (isLockAcquired(key)) {
        waitingProcess.set(key, proc);
        return;
    }
    await serialized(key, proc);
    if (waitingProcess.has(key)) {
        const nextProc = waitingProcess.get(key);
        waitingProcess.delete(key);
        scheduleOnceIfDuplicated(key, nextProc);
    }
}
/**
 * Checks if a lock is acquired for the given key.
 * @param key - The key to check for lock acquisition.
 * @returns `true` if the lock is acquired, `false` otherwise.
 * @deprecated This module is deprecated and will be removed in the future.
 * use lock_v2.ts instead.
 */
function isLockAcquired(key) {
    return queueTails.get(key) !== undefined;
}

export { isLockAcquired, scheduleOnceIfDuplicated, serialized, shareRunningResult, skipIfDuplicated };
//# sourceMappingURL=lock_v1.js.map
