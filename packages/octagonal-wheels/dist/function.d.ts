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
export declare const throttle: <T extends (...args: any[]) => any>(func: T, timeout: number) => ThrottledFunction<T>;
