export type Task<T> = () => Promise<T> | T;
/**
 * Run tasks one by one in their group.
 * @param key key of the group
 * @param proc process to run
 * @returns result of the process
 */
export declare function serialized<T>(key: string | symbol, proc: Task<T>): Promise<T>;
export declare const SYMBOL_SKIPPED: unique symbol;
export declare function onlyLatest<T>(key: string | symbol, proc: Task<T>): Promise<T | typeof SYMBOL_SKIPPED>;
/**
 * If free, run task and return the result (Same as serialized).
 * If any process has running, share the result.
 * Mostly same as `SlipBoard.issueAndProceed` but this is for general purpose.
 * @param key key of the group
 * @param proc process to run
 */
export declare function shareRunningResult<T>(key: string | symbol, proc: Task<T>): Promise<T>;
/**
 * Skips the execution of a task if it is already duplicated.
 *
 * @param key - The key to identify the task.
 * @param proc - The task to be executed.
 * @returns A promise that resolves to the result of the task, or `null` if the task is duplicated.
 */
export declare function skipIfDuplicated<T>(key: string | symbol, proc: Task<T>): Promise<T | null>;
/**
 * Schedules a process to be executed once if it is not already running.
 * If the process is already running, it will be added to the waiting queue. An existing waiting process will be replaced.
 *
 * @param key - The key used to identify the process.
 * @param proc - The process to be executed.
 * @returns A Promise that resolves once the process has been scheduled.
 */
export declare function scheduleOnceIfDuplicated<T>(key: string, proc: () => Promise<T>): Promise<T | null | undefined>;
/**
 * Checks if a serialised-processing-lock is acquired for the given key.
 * @param key - The key to check for lock acquisition.
 * @returns `true` if the lock is acquired, `false` otherwise.
 */
export declare function isLockAcquired(key: string | symbol): boolean;
/**
 * Concurrency controller to limit the number of concurrent tasks.
 * Similar to a semaphore but with a simpler `run` method.
 * Petit semaphore for limiting concurrency.
 */
export declare class ConcurrentTaskController {
    maxConcurrency: number;
    private onFree;
    constructor(maxConcurrency: number);
    private runningTasks;
    private totalOnProcess;
    /**
     * Current number of waiting and running tasks.
     */
    get currentPressure(): number;
    get currentConcurrency(): number;
    /**
     * Manually acquire a slot for running a task.
     * @returns A releaser function to call when the task is done.
     */
    __acquire(): Promise<() => void>;
    /**
     * Run a task with concurrency control.
     * @param task task to run
     * @param reportProgress optional function to report progress (e.g., update UI)
     * @returns result of the task
     */
    run<T>(task: () => Promise<T>, reportProgress?: () => Promise<any>): Promise<T>;
    /**
     * Wait until all running tasks are released.
     * Note: This does not prevent new tasks from being started after this method returns.
     */
    waitForAllReleased(): Promise<void>;
}
/**
 * Symbol to indicate that the scheduled task was skipped.
 */
export declare const SCHEDULE_SKIPPED: unique symbol;
/**
 * Schedule a task to run with concurrency control, ensuring that only the latest task is run.
 * @param group The group to which the task belongs.
 * @param key The unique key for the task.
 * @param proc The function to run the task.
 * @returns A promise that resolves with the result of the task or a symbol indicating the task was skipped.
 */
export declare function scheduleAndRunOnlyLatest<T>(group: string, key: string, proc: (ac?: AbortController) => Promise<T>): Promise<T | typeof SCHEDULE_SKIPPED>;
