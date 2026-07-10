import { promiseWithResolvers, fireAndForget } from '../promises.js';

// --- asynchronous execution / locking utilities
/**
 * Run tasks one by one in their group.
 */
const serializedMap = new Map();
/**
 * How many tasks waiting for the same key (on serialized processing)
 */
const queueCount = new Map();
/**
 * Tasks that are waiting for the same key (on serialized processing)
 */
const waitingProcessMap = new Map();
/**
 * Tasks that are waiting for the same key (on sharing result)
 */
const shareSerializedMap = new Map();
/**
 * Tasks that are waiting for the same key (on skipping duplicated)
 */
const skipDuplicatedMap = new Map();
/**
 * Run tasks one by one in their group.
 * @param key key of the group
 * @param proc process to run
 * @returns result of the process
 */
function serialized(key, proc) {
    const prev = serializedMap.get(key);
    const p = promiseWithResolvers();
    queueCount.set(key, (queueCount.get(key) ?? 0) + 1);
    const nextTask = async () => {
        try {
            p.resolve(await proc());
        }
        catch (ex) {
            p.reject(ex);
        }
        finally {
            const count = queueCount.get(key) - 1;
            if (count === 0) {
                serializedMap.delete(key);
                queueCount.delete(key);
            }
            else {
                queueCount.set(key, count);
            }
        }
    };
    if (prev) {
        const newP = prev.then(() => nextTask());
        serializedMap.set(key, newP);
    }
    else {
        serializedMap.set(key, nextTask());
    }
    return p.promise;
}
const latestProcessMap = new Map();
const SYMBOL_SKIPPED = Symbol("SKIPPED");
function onlyLatest(key, proc) {
    const p = promiseWithResolvers();
    latestProcessMap.set(key, p.promise);
    fireAndForget(async () => {
        try {
            await serialized(key, async () => {
                try {
                    const latestProcess = latestProcessMap.get(key);
                    // If the latest process is not this one (meaning another process is waiting or running), this process is skipped.
                    if (latestProcess && latestProcess !== p.promise) {
                        p.resolve(SYMBOL_SKIPPED);
                        return;
                    }
                    // Otherwise, run the process
                    try {
                        const r = await proc();
                        p.resolve(r);
                    }
                    catch (ex) {
                        p.reject(ex);
                    }
                    return;
                }
                finally {
                    // After the process is done, delete the mark if it is still the latest one.
                    if (latestProcessMap.get(key) === p.promise) {
                        latestProcessMap.delete(key);
                    }
                }
            });
        }
        catch (ex) {
            // Ensure that the promise is removed from the map after completion.
            if (latestProcessMap.get(key) === p.promise) {
                latestProcessMap.delete(key);
            }
            p.reject(ex);
        }
    });
    return p.promise;
}
/**
 * If free, run task and return the result (Same as serialized).
 * If any process has running, share the result.
 * Mostly same as `SlipBoard.issueAndProceed` but this is for general purpose.
 * @param key key of the group
 * @param proc process to run
 */
function shareRunningResult(key, proc) {
    const prev = shareSerializedMap.get(key);
    if (prev)
        return prev;
    const p = promiseWithResolvers();
    shareSerializedMap.set(key, p.promise);
    const task = async () => {
        try {
            p.resolve(await proc());
        }
        catch (ex) {
            p.reject(ex);
        }
        finally {
            shareSerializedMap.delete(key);
        }
    };
    fireAndForget(() => task());
    return p.promise;
}
/**
 * Skips the execution of a task if it is already duplicated.
 *
 * @param key - The key to identify the task.
 * @param proc - The task to be executed.
 * @returns A promise that resolves to the result of the task, or `null` if the task is duplicated.
 */
function skipIfDuplicated(key, proc) {
    const prev = skipDuplicatedMap.get(key);
    if (prev)
        return Promise.resolve(null);
    const p = promiseWithResolvers();
    skipDuplicatedMap.set(key, p.promise);
    const task = async () => {
        try {
            p.resolve(await proc());
        }
        catch (ex) {
            p.reject(ex);
        }
        finally {
            skipDuplicatedMap.delete(key);
        }
    };
    fireAndForget(() => task());
    return p.promise;
}
/**
 * Schedules a process to be executed once if it is not already running.
 * If the process is already running, it will be added to the waiting queue. An existing waiting process will be replaced.
 *
 * @param key - The key used to identify the process.
 * @param proc - The process to be executed.
 * @returns A Promise that resolves once the process has been scheduled.
 */
async function scheduleOnceIfDuplicated(key, proc) {
    if (isLockAcquired(key)) {
        waitingProcessMap.set(key, proc);
        return Promise.resolve(undefined);
    }
    else {
        return await serialized(key, proc).then(() => {
            const nextProc = waitingProcessMap.get(key);
            if (nextProc) {
                waitingProcessMap.delete(key);
                return scheduleOnceIfDuplicated(key, nextProc);
            }
        });
    }
}
/**
 * Checks if a serialised-processing-lock is acquired for the given key.
 * @param key - The key to check for lock acquisition.
 * @returns `true` if the lock is acquired, `false` otherwise.
 */
function isLockAcquired(key) {
    const count = queueCount.get(key) ?? 0;
    return count > 0;
}
/**
 * Concurrency controller to limit the number of concurrent tasks.
 * Similar to a semaphore but with a simpler `run` method.
 * Petit semaphore for limiting concurrency.
 */
class ConcurrentTaskController {
    constructor(maxConcurrency) {
        Object.defineProperty(this, "maxConcurrency", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "onFree", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // tasks = new Set<PromiseWithResolvers<void>>();
        Object.defineProperty(this, "runningTasks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Set()
        });
        Object.defineProperty(this, "totalOnProcess", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        this.maxConcurrency = maxConcurrency;
    }
    /**
     * Current number of waiting and running tasks.
     */
    get currentPressure() {
        return this.totalOnProcess;
    }
    get currentConcurrency() {
        return this.runningTasks.size;
    }
    /**
     * Manually acquire a slot for running a task.
     * @returns A releaser function to call when the task is done.
     */
    async __acquire() {
        this.totalOnProcess++;
        while (this.runningTasks.size >= this.maxConcurrency) {
            if (!this.onFree) {
                this.onFree = promiseWithResolvers();
            }
            await this.onFree.promise;
        }
        const release = () => {
            if (this.runningTasks.has(release)) {
                this.runningTasks.delete(release);
            }
            if (this.onFree) {
                this.onFree.resolve();
                this.onFree = undefined;
            }
            this.totalOnProcess--;
        };
        this.runningTasks.add(release);
        return release;
    }
    /**
     * Run a task with concurrency control.
     * @param task task to run
     * @param reportProgress optional function to report progress (e.g., update UI)
     * @returns result of the task
     */
    async run(task, reportProgress) {
        const release = await this.__acquire();
        try {
            await reportProgress?.();
        }
        catch {
            // ignore errors in reportProgress
        }
        try {
            return await task();
        }
        finally {
            release();
            try {
                await reportProgress?.();
            }
            catch {
                // ignore errors in reportProgress
            }
        }
    }
    /**
     * Wait until all running tasks are released.
     * Note: This does not prevent new tasks from being started after this method returns.
     */
    async waitForAllReleased() {
        while (this.totalOnProcess > 0) {
            if (!this.onFree) {
                this.onFree = promiseWithResolvers();
            }
            await this.onFree.promise;
        }
    }
}
const scheduleMap = new Map();
const semaphores = new Map();
function getGroupController(group, concurrency = 1) {
    let semaphore = semaphores.get(group);
    if (!semaphore) {
        semaphore = new ConcurrentTaskController(concurrency);
        semaphores.set(group, semaphore);
    }
    return semaphore;
}
/**
 * Symbol to indicate that the scheduled task was skipped.
 */
const SCHEDULE_SKIPPED = Symbol("skipped");
/**
 * Schedule a task to run with concurrency control, ensuring that only the latest task is run.
 * @param group The group to which the task belongs.
 * @param key The unique key for the task.
 * @param proc The function to run the task.
 * @returns A promise that resolves with the result of the task or a symbol indicating the task was skipped.
 */
function scheduleAndRunOnlyLatest(group, key, proc) {
    const existing = scheduleMap.get(key);
    // Abort the existing task if it exists
    if (existing) {
        existing.controller.abort();
        scheduleMap.delete(key);
    }
    const semaphore = getGroupController(group);
    const controller = new AbortController();
    const task = async () => {
        return await semaphore.run(async () => {
            if (controller.signal.aborted) {
                // Just skip
                return Promise.resolve(SCHEDULE_SKIPPED);
            }
            try {
                return await proc(controller);
            }
            finally {
                // Clean up only if it's the latest task
                if (scheduleMap.get(key)?.controller === controller) {
                    scheduleMap.delete(key);
                }
            }
        });
    };
    scheduleMap.set(key, { task, controller });
    return task();
}

export { ConcurrentTaskController, SCHEDULE_SKIPPED, SYMBOL_SKIPPED, isLockAcquired, onlyLatest, scheduleAndRunOnlyLatest, scheduleOnceIfDuplicated, serialized, shareRunningResult, skipIfDuplicated };
//# sourceMappingURL=lock_v2.js.map
