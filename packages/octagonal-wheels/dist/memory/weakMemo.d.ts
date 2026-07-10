/**
 * Creates a weakly memoized version of an asynchronous function.
 * @param fn The asynchronous function to memoize.
 * @param keyFunction An optional function to generate a cache key from the function arguments.
 * @returns A new function that memoizes the results of the original function.
 */
export declare function weakMemo<T extends any[], TResult>(fn: (...args: T) => Promise<TResult>, keyFunction?: (args: T) => string): (...args: T) => Promise<TResult>;
