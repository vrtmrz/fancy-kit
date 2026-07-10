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
