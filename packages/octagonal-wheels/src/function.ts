export type ThrottledFunction<T extends (...args: any[]) => any> = (...args: Parameters<T>) => void;

/**
 * Thinning out the execution of a function by delaying subsequent invocations
 * until a specified timeout has passed since the last invocation.
 *
 * @template T - The type of the function being throttled.
 * @param func - The function to be throttled.
 * @param timeout - The timeout value in milliseconds.
 * @returns A throttled function that delays subsequent invocations.
 */
export const throttle = <T extends (...args: any[]) => any>(func: T, timeout: number): ThrottledFunction<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastTime: number = 0; // initialize lastTime to 0
    return (...args: Parameters<T>) => {
        if (!lastTime) {
            func(...args);
            lastTime = Date.now();
        } else {
            clearTimeout(timer);
            const delayTime = timeout - (Date.now() - lastTime);
            timer = setTimeout(() => {
                func(...args);
                lastTime = Date.now();
            }, delayTime);
        }
    };
};

/**
 * Invoke a callback only when its argument differs from the last remembered value.
 *
 * Each wrapper starts with `undefined` and uses strict equality (`===`). An
 * initial `undefined` is skipped; `NaN` always invokes the callback, signed
 * zeros compare equal, and objects are compared by identity. Only the last
 * value is retained, so returning to an earlier value invokes the callback.
 *
 * The value is remembered after a synchronous return. A synchronous exception
 * propagates without replacing the previous value. Callback results are
 * discarded; returned promises are not awaited and their failures belong to
 * the caller. State is private to each wrapper.
 *
 * @param func - Callback whose consecutive duplicate arguments are suppressed.
 * @returns A function with an independent last-argument value.
 */
export function onlyWhenChanged<T>(func: (arg: T) => void) {
    let buf: T | undefined = undefined;
    return (arg: T) => {
        if (buf !== arg) {
            func(arg);
            buf = arg;
        }
    };
}
