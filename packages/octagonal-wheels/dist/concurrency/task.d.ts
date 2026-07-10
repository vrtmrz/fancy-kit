import { type PromiseWithResolvers } from "../promises.ts";
export type TaskProcessing<T> = Promise<T>;
export type TaskWaiting<T> = () => Promise<T>;
export type Task<T> = TaskProcessing<T> | TaskWaiting<T>;
export type TaskResult<T, U extends Error> = {
    ok: T;
} | {
    err: U;
};
export type TaskResultWithKey<T, U extends Error> = TaskResult<T, U> & {
    key: number;
};
export type ProcessingTaskResultWithKey<T, U extends Error> = Promise<TaskResultWithKey<T, U>>;
export declare function unwrapTaskResult<T, U extends Error>(result: TaskResult<T, U>): T | U;
/**
 * Perform all tasks within given concurrency.
 * @param limit Concurrency limit
 * @param tasks Tasks to perform all
 *
 */
export declare function processAllGeneratorTasksWithConcurrencyLimit<T>(limit: number, tasks: AsyncGenerator<Task<T>, undefined, unknown>): AsyncGenerator<TaskResultWithKey<T, Error>, void, unknown>;
export declare function pipeGeneratorToGenerator<T, U>(generator: AsyncGenerator<T>, callback: (obj: T) => Promise<U>): AsyncGenerator<TaskWaiting<U>>;
export declare function pipeArrayToGenerator<T, U>(array: T[], callback: (obj: T) => Promise<U>): Generator<TaskWaiting<U>>;
/**
 * Perform all tasks within given concurrency.
 * @param limit Concurrency limit
 * @param tasks Tasks to perform all
 *
 */
export declare function processAllTasksWithConcurrencyLimit<T>(limit: number, tasks: Task<T>[]): AsyncGenerator<TaskResultWithKey<T, Error>, void, unknown>;
/**
 * Perform all tasks and returns all result by keeping the order.
 * @param limit Concurrency limit
 * @param tasks Tasks to perform all
 * @returns
 */
export declare function mapAllTasksWithConcurrencyLimit<T>(limit: number, tasks: Task<T>[]): Promise<TaskResultWithKey<T, Error>[]>;
export declare function scheduleTask(key: string, timeout: number, proc: () => Promise<any> | void, skipIfTaskExist?: boolean): void;
export declare function cancelTask(key: string): void;
export declare function cancelAllTasks(): void;
export declare function setPeriodicTask(key: string, timeout: number, proc: () => Promise<any> | void): void;
export declare function cancelPeriodicTask(key: string): void;
export declare function cancelAllPeriodicTask(): void;
export declare function waitForTimeout(key: string, timeout: number): Promise<boolean>;
export declare function finishWaitingForTimeout(key: string, hasTimeout?: boolean): void;
export declare function finishAllWaitingForTimeout(prefix: string, hasTimeout: boolean): void;
export declare function isWaitingForTimeout(key: string): boolean;
export type ResolverWithKey<T> = {
    key: string;
    resolver: PromiseWithResolvers<T>;
};
/**
 * @deprecated
 * Use shareRunningResult instead.
 * @param key
 * @param proc
 * @returns
 */
export declare function sharedTask<T>(key: string, proc: () => Promise<T>): Promise<T>;
export declare function wrapFunctionAsShared<P extends any[], T>(proc: (...p: P) => Promise<T>): (...p: P) => Promise<T>;
