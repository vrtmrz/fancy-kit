// --- asynchronous execution / locking utilities
import { fireAndForget, promiseWithResolvers, type PromiseWithResolvers } from "../promises.ts";

export type Task<T> = () => Promise<T> | T;

/**
 * Run tasks one by one in their group.
 */
const serializedMap = new Map<string | symbol, Promise<void>>();
/**
 * How many tasks waiting for the same key (on serialized processing)
 */
const queueCount = new Map<string | symbol, number>();

/**
 * Tasks that are waiting for the same key (on serialized processing)
 */

const waitingProcessMap = new Map<string | symbol, Task<any>>();

/**
 * Tasks that are waiting for the same key (on sharing result)
 */
const shareSerializedMap = new Map<string | symbol, Promise<any>>();

/**
 * Tasks that are waiting for the same key (on skipping duplicated)
 */
const skipDuplicatedMap = new Map<string | symbol, Promise<any>>();

/**
 * Run tasks one by one in their group.
 * @param key key of the group
 * @param proc process to run
 * @returns result of the process
 */

export function serialized<T>(key: string | symbol, proc: Task<T>): Promise<T> {
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

const latestProcessMap = new Map<string | symbol, Promise<any>>();
export const SYMBOL_SKIPPED = Symbol("SKIPPED");

export function onlyLatest<T>(key: string | symbol, proc: Task<T>): Promise<T | typeof SYMBOL_SKIPPED> {
    const p = promiseWithResolvers<T | typeof SYMBOL_SKIPPED>();
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
                    } catch (ex) {
                        p.reject(ex);
                    }
                    return;
                } finally {
                    // After the process is done, delete the mark if it is still the latest one.
                    if (latestProcessMap.get(key) === p.promise) {
                        latestProcessMap.delete(key);
                    }
                }
            });
        } catch (ex) {
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
export function shareRunningResult<T>(key: string | symbol, proc: Task<T>): Promise<T> {
    const prev = shareSerializedMap.get(key) as Promise<T> | undefined;
    if (prev) return prev;

    const p = promiseWithResolvers<T>();
    shareSerializedMap.set(key, p.promise);

    const task = async () => {
        try {
            p.resolve(await proc());
        } catch (ex) {
            p.reject(ex);
        } finally {
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
export function skipIfDuplicated<T>(key: string | symbol, proc: Task<T>): Promise<T | null> {
    const prev = skipDuplicatedMap.get(key) as Promise<T> | undefined;
    if (prev) return Promise.resolve(null);

    const p = promiseWithResolvers<T>();
    skipDuplicatedMap.set(key, p.promise);

    const task = async () => {
        try {
            p.resolve(await proc());
        } catch (ex) {
            p.reject(ex);
        } finally {
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
export async function scheduleOnceIfDuplicated<T>(key: string, proc: () => Promise<T>): Promise<T | null | undefined> {
    if (isLockAcquired(key)) {
        waitingProcessMap.set(key, proc);
        return Promise.resolve(undefined);
    } else {
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
export function isLockAcquired(key: string | symbol): boolean {
    const count = queueCount.get(key) ?? 0;
    return count > 0;
}

/**
 * Concurrency controller to limit the number of concurrent tasks.
 * Similar to a semaphore but with a simpler `run` method.
 * Petit semaphore for limiting concurrency.
 */
export class ConcurrentTaskController {
    public maxConcurrency: number;
    private onFree: PromiseWithResolvers<void> | undefined;
    constructor(maxConcurrency: number) {
        this.maxConcurrency = maxConcurrency;
    }
    // tasks = new Set<PromiseWithResolvers<void>>();
    private runningTasks = new Set<() => void>();
    private totalOnProcess = 0;

    /**
     * Current number of waiting and running tasks.
     */
    public get currentPressure() {
        return this.totalOnProcess;
    }
    public get currentConcurrency() {
        return this.runningTasks.size;
    }

    /**
     * Manually acquire a slot for running a task.
     * @returns A releaser function to call when the task is done.
     */
    async __acquire(): Promise<() => void> {
        this.totalOnProcess++;
        while (this.runningTasks.size >= this.maxConcurrency) {
            if (!this.onFree) {
                this.onFree = promiseWithResolvers<void>();
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
    async run<T>(task: () => Promise<T>, reportProgress?: () => Promise<any>): Promise<T> {
        const release = await this.__acquire();
        try {
            await reportProgress?.();
        } catch {
            // ignore errors in reportProgress
        }
        try {
            return await task();
        } finally {
            release();
            try {
                await reportProgress?.();
            } catch {
                // ignore errors in reportProgress
            }
        }
    }
    /**
     * Wait until all running tasks are released.
     * Note: This does not prevent new tasks from being started after this method returns.
     */
    async waitForAllReleased(): Promise<void> {
        while (this.totalOnProcess > 0) {
            if (!this.onFree) {
                this.onFree = promiseWithResolvers<void>();
            }
            await this.onFree.promise;
        }
    }
}

const scheduleMap = new Map<
    string,
    {
        task: () => Promise<any>;
        controller: AbortController;
    }
>();
const semaphores = new Map<string, ConcurrentTaskController>();

function getGroupController(group: string, concurrency: number = 1) {
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
export const SCHEDULE_SKIPPED = Symbol("skipped");

/**
 * Schedule a task to run with concurrency control, ensuring that only the latest task is run.
 * @param group The group to which the task belongs.
 * @param key The unique key for the task.
 * @param proc The function to run the task.
 * @returns A promise that resolves with the result of the task or a symbol indicating the task was skipped.
 */
export function scheduleAndRunOnlyLatest<T>(
    group: string,
    key: string,
    proc: (ac?: AbortController) => Promise<T>
): Promise<T | typeof SCHEDULE_SKIPPED> {
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
            } finally {
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
