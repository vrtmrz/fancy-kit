/**
 * Delays the execution of a function by the specified number of milliseconds.
 * @param ms - The number of milliseconds to delay the execution.
 * @param result - The optional result value to be resolved with after the delay.
 * @returns A promise that resolves with the specified result value after the delay.
 */
const delay = (ms, result) => {
    return new Promise((res) => {
        setTimeout(() => {
            res(result);
        }, ms);
    });
};
const UNRESOLVED = Symbol("UNRESOLVED");
/**
 * Checking whether a promise has been resolved.
 * @param promise a checking promise
 * @returns true if resolved, false if not.
 */
async function isResolved(promise) {
    return (await Promise.race([promise, Promise.resolve(UNRESOLVED)])) !== UNRESOLVED;
}
/**
 * Checking whether some promises have been resolved.
 * @param promises checking promises
 * @returns true if some promises have been resolved, false if not.
 */
async function isSomeResolved(promises) {
    if (promises.length == 0)
        return false;
    return (await Promise.race([...promises, Promise.resolve(UNRESOLVED)])) !== UNRESOLVED;
}
/**
 * Creates a promise and returns it along with the resolve and reject functions.
 * @returns An object containing the promise, resolve, and reject functions.
 * @template T The type of the promise value.
 */
function polyfillPromiseWithResolvers() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
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
function nativePromiseWithResolvers() {
    const p = Promise.withResolvers();
    const { promise, resolve, reject } = p;
    return { promise, resolve, reject };
}
const polyfilledFunc = "withResolvers" in Promise ? nativePromiseWithResolvers : polyfillPromiseWithResolvers;
/**
 * Creates a promise with custom resolvers.
 * @param {Function} polyfillPromiseWithResolvers - The function that polyfills the promise with resolvers.
 * @returns {Promise} - The promise with custom resolvers.
 */
const promiseWithResolvers = polyfilledFunc;
/**
 * Creates a promise with custom resolvers. This is kept for compatibility with older code.
 * @deprecated Use `promiseWithResolvers` instead. (Wrong name)
 */
const promiseWithResolver = polyfilledFunc;
/**
 * A no-operation function.
 */
const noop = () => {
    /* NO OP */
};
/**
 * Executes a promise or a function that returns a promise and ignores any errors or results.
 * @param p - The promise or function that returns a promise to be executed.
 */
function fireAndForget(p) {
    if (typeof p == "function")
        return fireAndForget(p());
    p.then(noop).catch(noop);
}
/**
 * Yields a microtask.
 *
 * @returns A promise that resolves when the microtask is completed.
 */
function yieldMicrotask() {
    return new Promise((res) => queueMicrotask(res));
}
/**
 * A utility function that wraps the `requestIdleCallback` function and returns a promise.
 * If `requestIdleCallback` is not available in the global scope (iOS, Safari), it falls back to `yieldMicrotask`.
 *
 * @param options - The options to be passed to the `requestIdleCallback` function.
 * @returns A promise that resolves when the idle callback is executed.
 */
function yieldRequestIdleCallback(options) {
    if (!("requestIdleCallback" in globalThis))
        return yieldMicrotask();
    return new Promise((res) => requestIdleCallback(() => res(), options));
}
/**
 * Yields the next animation frame.
 *
 * @returns A promise that resolves with the next animation frame.
 */
function yieldAnimationFrame() {
    return new Promise((res) => requestAnimationFrame(res));
}
/**
 * Yields the next batched animation frame.
 *
 * @returns A promise that resolves with the next frame.
 */
let currentYieldingAnimationFrame;
function yieldNextAnimationFrame() {
    if (currentYieldingAnimationFrame)
        return currentYieldingAnimationFrame;
    currentYieldingAnimationFrame = (async () => {
        const ret = await yieldAnimationFrame();
        currentYieldingAnimationFrame = undefined;
        return ret;
    })();
    return currentYieldingAnimationFrame;
}
let currentYieldingMicrotask;
function yieldNextMicrotask() {
    if (currentYieldingMicrotask)
        return currentYieldingMicrotask;
    currentYieldingMicrotask = (async () => {
        await yieldMicrotask();
        currentYieldingMicrotask = undefined;
    })();
    return currentYieldingMicrotask;
}
const TIMED_OUT_SIGNAL = Symbol("timed out");
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
function cancelableDelay(timeout, cancel = TIMED_OUT_SIGNAL) {
    let timer = undefined;
    const promise = promiseWithResolvers();
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
function extendableDelay(timeout, cancel) {
    let timer = undefined;
    const promise = promiseWithResolvers();
    let resolved = false;
    const setTimer = (newTimeout) => {
        if (resolved)
            throw new Error("Already resolved!");
        return setTimeout(() => {
            timer = undefined;
            promise.resolve(TIMED_OUT_SIGNAL);
            resolved = true;
        }, newTimeout);
    };
    const extendTimer = (newTimeout) => {
        if (resolved)
            throw new Error("Already resolved!");
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

export { TIMED_OUT_SIGNAL, cancelableDelay, delay, extendableDelay, fireAndForget, isResolved, isSomeResolved, nativePromiseWithResolvers, noop, polyfillPromiseWithResolvers, promiseWithResolver, promiseWithResolvers, yieldAnimationFrame, yieldMicrotask, yieldNextAnimationFrame, yieldNextMicrotask, yieldRequestIdleCallback };
//# sourceMappingURL=promises.js.map
