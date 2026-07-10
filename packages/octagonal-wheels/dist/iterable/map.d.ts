/**
 * apply a function to each element of an iterable asynchronously with a concurrency limit.
 * Note that the order of the elements is not guaranteed.
 * @param iterable An iterable items to be processed.
 * @param callback A function to be applied to each element of the iterable.
 * @param concurrency The number of concurrent processes.
 */
export declare function withConcurrency<T, U>(iterable: Iterable<T> | AsyncIterable<T>, callback: (t: T) => Promise<U> | U, concurrency: number): AsyncIterable<U>;
/**
 * Just like an filter function in the Array, but this function is asynchronous.
 * @param iterable Source iterable.
 * @param callback Filtering function.
 */
export declare function filter<T>(iterable: Iterable<T> | AsyncIterable<T>, callback: (t: T) => boolean | Promise<boolean>): AsyncIterable<T>;
export declare function map<T, U>(iterable: Iterable<T> | AsyncIterable<T>, callback: (t: T) => U | Promise<U>): AsyncIterable<U>;
/**
 * apply a function to each element of an iterable asynchronously, as keeping the order of the elements.
 * @param iterable an iterable items to be processed.
 * @param callback a function to be applied to each element of the iterable.
 * @param concurrency  the number of concurrent processes.
 */
export declare function asyncMapWithConcurrency<T, U>(iterable: Iterable<T> | AsyncIterable<T>, callback: (t: T) => U | Promise<U>, concurrency: number): AsyncIterable<U>;
