/**
 * Delays the execution of a function by the specified number of milliseconds.
 * @param ms - The number of milliseconds to delay the execution.
 * @param result - The optional result value to be resolved with after the delay.
 * @returns A promise that resolves with the specified result value after the delay.
 */
export const delay = <T>(ms: number, result?: T): Promise<T> => {
    return new Promise((res) => {
        setTimeout(() => {
            res(result!);
        }, ms);
    });
};

const UNRESOLVED = Symbol("UNRESOLVED");

/**
 * Checking whether a promise has been resolved.
 * @param promise a checking promise
 * @returns true if resolved, false if not.
 */
export async function isResolved(promise: Promise<unknown>): Promise<boolean> {
    return (await Promise.race([promise, Promise.resolve(UNRESOLVED)])) !== UNRESOLVED;
}
/**
 * Checking whether some promises have been resolved.
 * @param promises checking promises
 * @returns true if some promises have been resolved, false if not.
 */
export async function isSomeResolved(promises: Promise<unknown>[]): Promise<boolean> {
    if (promises.length == 0) return false;
    return (await Promise.race([...promises, Promise.resolve(UNRESOLVED)])) !== UNRESOLVED;
}

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
export function polyfillPromiseWithResolvers<T>(): PromiseWithResolvers<T> {
    let resolve!: Parameters<ConstructorParameters<typeof Promise<T>>[0]>[0];
    let reject!: Parameters<ConstructorParameters<typeof Promise<T>>[0]>[1];
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

/**
 * Creates a native promise with resolvers. This function is used when the `Promise.withResolvers` function is available.
 * @template T The type of the promise value.
 * @returns An object containing the promise, resolve function, and reject function.
 */
export function nativePromiseWithResolvers<T>() {
    const p = Promise.withResolvers<T>();
    const { promise, resolve, reject } = p;
    return { promise, resolve, reject };
}

const polyfilledFunc = "withResolvers" in Promise ? nativePromiseWithResolvers : polyfillPromiseWithResolvers;

/**
 * Creates a promise with custom resolvers.
 * @param {Function} polyfillPromiseWithResolvers - The function that polyfills the promise with resolvers.
 * @returns {Promise} - The promise with custom resolvers.
 */

export const promiseWithResolvers = polyfilledFunc;

/**
 * Creates a promise with custom resolvers. This is kept for compatibility with older code.
 * @deprecated Use `promiseWithResolvers` instead. (Wrong name)
 */
export const promiseWithResolver = polyfilledFunc;

/**
 * A no-operation function.
 */
export const noop = () => {
    /* NO OP */
};

/**
 * Executes a promise or a function that returns a promise and ignores any errors or results.
 * @param p - The promise or function that returns a promise to be executed.
 */
export function fireAndForget(p: Promise<any> | (() => Promise<any>)): void {
    if (typeof p == "function") return fireAndForget(p());
    p.then(noop).catch(noop);
}

/**
 * Yields a microtask.
 *
 * @returns A promise that resolves when the microtask is completed.
 */
export function yieldMicrotask() {
    return new Promise<void>((res) => queueMicrotask(res));
}

/**
 * A utility function that wraps the `requestIdleCallback` function and returns a promise.
 * If `requestIdleCallback` is not available in the global scope (iOS, Safari), it falls back to `yieldMicrotask`.
 *
 * @param options - The options to be passed to the `requestIdleCallback` function.
 * @returns A promise that resolves when the idle callback is executed.
 */
export function yieldRequestIdleCallback(options?: Parameters<typeof requestIdleCallback>[1]) {
    if (!("requestIdleCallback" in globalThis)) return yieldMicrotask();
    return new Promise<void>((res) => requestIdleCallback(() => res(), options));
}

/**
 * Yields the next animation frame.
 *
 * @returns A promise that resolves with the next animation frame.
 */
export function yieldAnimationFrame() {
    return new Promise<number>((res) => requestAnimationFrame(res));
}

/**
 * Yields the next batched animation frame.
 *
 * @returns A promise that resolves with the next frame.
 */

let currentYieldingAnimationFrame: Promise<number> | undefined;
export function yieldNextAnimationFrame() {
    if (currentYieldingAnimationFrame) return currentYieldingAnimationFrame;
    currentYieldingAnimationFrame = (async () => {
        const ret = await yieldAnimationFrame();
        currentYieldingAnimationFrame = undefined;
        return ret;
    })();
    return currentYieldingAnimationFrame;
}

let currentYieldingMicrotask: Promise<void> | undefined;

export function yieldNextMicrotask() {
    if (currentYieldingMicrotask) return currentYieldingMicrotask;
    currentYieldingMicrotask = (async () => {
        await yieldMicrotask();
        currentYieldingMicrotask = undefined;
    })();
    return currentYieldingMicrotask;
}

export const TIMED_OUT_SIGNAL = Symbol("timed out");
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
export function cancelableDelay<T = TIMED_OUT_SIGNAL>(timeout: number, cancel: T = TIMED_OUT_SIGNAL as T) {
    let timer: ReturnType<typeof setTimeout> | undefined = undefined;
    const promise = promiseWithResolvers<T>();
    timer = setTimeout(() => {
        timer = undefined;
        promise.resolve(cancel);
    }, timeout);
    return {
        promise: promise.promise,
        cancel() {
            if (timer) {
                clearTimeout(timer);
                timer = undefined;
            }
        },
    };
}

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
export function extendableDelay<U extends string | symbol | number = TIMED_OUT_SIGNAL>(
    timeout: number,
    cancel: U
): ExtendableDelay<TIMED_OUT_SIGNAL, U> {
    let timer: ReturnType<typeof setTimeout> | undefined = undefined;
    const promise = promiseWithResolvers<TIMED_OUT_SIGNAL | U>();
    let resolved = false;
    const setTimer = (newTimeout: number) => {
        if (resolved) throw new Error("Already resolved!");
        return setTimeout(() => {
            timer = undefined;
            promise.resolve(TIMED_OUT_SIGNAL);
            resolved = true;
        }, newTimeout);
    };
    const extendTimer = (newTimeout: number) => {
        if (resolved) throw new Error("Already resolved!");
        if (timer) {
            clearTimeout(timer);
            timer = undefined;
        }
        timer = setTimer(newTimeout);
    };
    const canceller = () => {
        if (timer && !resolved) {
            clearTimeout(timer);
            timer = undefined;
            promise.resolve(cancel);
            resolved = true;
        }
    };
    timer = setTimer(timeout);
    return {
        get promise() {
            return promise.promise;
        },
        cancel: canceller,
        extend: extendTimer,
    };
}
