/**
 * Delays the execution of a function by the specified number of milliseconds.
 * @param ms - The number of milliseconds to delay the execution.
 * @param result - The optional result value to be resolved with after the delay.
 * @returns A promise that resolves with the specified result value after the delay.
 */
export declare const delay: <T>(ms: number, result?: T) => Promise<T>;
/**
 * Checking whether a promise has been resolved.
 * @param promise a checking promise
 * @returns true if resolved, false if not.
 */
export declare function isResolved(promise: Promise<unknown>): Promise<boolean>;
/**
 * Checking whether some promises have been resolved.
 * @param promises checking promises
 * @returns true if some promises have been resolved, false if not.
 */
export declare function isSomeResolved(promises: Promise<unknown>[]): Promise<boolean>;
/**
 * A promise with resolver functions.
 */
export type PromiseWithResolvers<T> = {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
};
/**
 * Creates a promise and returns it along with the resolve and reject functions.
 * @returns An object containing the promise, resolve, and reject functions.
 * @template T The type of the promise value.
 */
export declare function polyfillPromiseWithResolvers<T>(): PromiseWithResolvers<T>;
/**
 * Creates a native promise with resolvers. This function is used when the `Promise.withResolvers` function is available.
 * @template T The type of the promise value.
 * @returns An object containing the promise, resolve function, and reject function.
 */
export declare function nativePromiseWithResolvers<T>(): {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
};
/**
 * Creates a promise with custom resolvers.
 * @param {Function} polyfillPromiseWithResolvers - The function that polyfills the promise with resolvers.
 * @returns {Promise} - The promise with custom resolvers.
 */
export declare const promiseWithResolvers: typeof nativePromiseWithResolvers;
/**
 * Creates a promise with custom resolvers. This is kept for compatibility with older code.
 * @deprecated Use `promiseWithResolvers` instead. (Wrong name)
 */
export declare const promiseWithResolver: typeof nativePromiseWithResolvers;
/**
 * A no-operation function.
 */
export declare const noop: () => void;
/**
 * Executes a promise or a function that returns a promise and ignores any errors or results.
 * @param p - The promise or function that returns a promise to be executed.
 */
export declare function fireAndForget(p: Promise<any> | (() => Promise<any>)): void;
/**
 * Yields a microtask.
 *
 * @returns A promise that resolves when the microtask is completed.
 */
export declare function yieldMicrotask(): Promise<void>;
/**
 * A utility function that wraps the `requestIdleCallback` function and returns a promise.
 * If `requestIdleCallback` is not available in the global scope (iOS, Safari), it falls back to `yieldMicrotask`.
 *
 * @param options - The options to be passed to the `requestIdleCallback` function.
 * @returns A promise that resolves when the idle callback is executed.
 */
export declare function yieldRequestIdleCallback(options?: Parameters<typeof requestIdleCallback>[1]): Promise<void>;
/**
 * Yields the next animation frame.
 *
 * @returns A promise that resolves with the next animation frame.
 */
export declare function yieldAnimationFrame(): Promise<number>;
export declare function yieldNextAnimationFrame(): Promise<number>;
export declare function yieldNextMicrotask(): Promise<void>;
export declare const TIMED_OUT_SIGNAL: unique symbol;
export type TIMED_OUT_SIGNAL = typeof TIMED_OUT_SIGNAL;
/**
 * Creates a delay that can be canceled.
 *
 * @template T - The type of the cancel signal.
 * @param {number} timeout - The delay duration in milliseconds.
 * @param {T} [cancel=TIMED_OUT_SIGNAL as T] - The value to resolve the promise with if the delay is canceled.
 * @returns An object containing the promise and a cancel function.
 * @returns {Promise<T>} promise - A promise that resolves with the cancel signal after the timeout.
 * @returns {() => void} cancel - A function to cancel the delay.
 */
export declare function cancelableDelay<T = TIMED_OUT_SIGNAL>(timeout: number, cancel?: T): {
    promise: Promise<T>;
    cancel(): void;
};
/**
 * An extendable delay that can be cancelled or extended.
 */
export type ExtendableDelay<T, U extends string | symbol | number> = {
    promise: Promise<T | U>;
    cancel: (reason: T | U) => void;
    extend(newTimeout: number): void;
};
/**
 * Creates an extendable delay that can be cancelled or extended.
 *
 * @template U - The type of the cancel signal,
 * @param {number} timeout - The initial timeout duration in milliseconds.
 * @param {U} cancel - The signal to use when cancelling the delay.
 * @returns {ExtendableDelay<TIMED_OUT_SIGNAL, U>} An object containing the promise, cancel function, and extend function.
 *
 * @property {Promise<TIMED_OUT_SIGNAL | U>} promise - The promise that resolves when the delay completes or is cancelled.
 * @property {() => void} cancel - Cancels the delay and resolves the promise with the cancel signal.
 * @property {(newTimeout: number) => void} extend - Extends the delay by the specified timeout duration.
 *
 * @throws {Error} If the delay has already been resolved.
 */
export declare function extendableDelay<U extends string | symbol | number = TIMED_OUT_SIGNAL>(timeout: number, cancel: U): ExtendableDelay<TIMED_OUT_SIGNAL, U>;
