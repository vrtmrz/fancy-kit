type Task<T> = () => Promise<T> | T;
/**
 * Run tasks one by one in their group.
 * @param key key of the group
 * @param proc process to run
 * @returns result of the process
 * @deprecated This module is deprecated and will be removed in the future.
 * use lock_v2.ts instead.
 */
export declare function serialized<T>(key: string | symbol, proc: Task<T>): Promise<T>;
/**
 * If free, run task and return the result (Same as serialized).
 * If any process has running, share the result.
 * @param key key of the group
 * @param proc process to run
 * @deprecated This module is deprecated and will be removed in the future.
 * use lock_v2.ts instead.
 */
export declare function shareRunningResult<T>(key: string | symbol, proc: Task<T>): Promise<T>;
/**
 * Skips the execution of a task if it is already duplicated.
 *
 * @param key - The key to identify the task.
 * @param proc - The task to be executed.
 * @returns A promise that resolves to the result of the task, or `null` if the task is duplicated.
 * @deprecated This module is deprecated and will be removed in the future.
 * use lock_v2.ts instead.
 */
export declare function skipIfDuplicated<T>(key: string | symbol, proc: Task<T>): Promise<T | null>;
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
export declare function scheduleOnceIfDuplicated<T>(key: string, proc: () => Promise<T>): Promise<void>;
/**
 * Checks if a lock is acquired for the given key.
 * @param key - The key to check for lock acquisition.
 * @returns `true` if the lock is acquired, `false` otherwise.
 * @deprecated This module is deprecated and will be removed in the future.
 * use lock_v2.ts instead.
 */
export declare function isLockAcquired(key: string): boolean;
export {};
