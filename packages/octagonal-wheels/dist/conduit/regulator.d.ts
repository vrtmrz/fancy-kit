/**
 * Regulator
 * @remarks
 * Regulator allows you to regulate the number of concurrent processes.
 *
 * @example
 * const reg = new Regulator(2);
 * reg.onProcess(async example(args) => {
 *     // do something with args
 * });
 *
 * reg.invoke([1, 2, 3]); (all example will be called with [1, 2, 3] but only 2 at a time will be processed)
 */
export interface RegulatorOf<T extends any[], U> {
    /**
     * @remarks
     * Set the maximum number of concurrent processes.
     * Default is 1.
     * @param n
     * @returns <RegulatorOf<T, U>>
     */
    maxConcurrency(n: number): RegulatorOf<T, U>;
    /**
     * @remarks
     * Set the function to be called when the regulator is invoked.
     * @param func
     * @returns <RegulatorOf<T, U>>
     */
    onProcess(func: (...args: T) => Promise<U>): RegulatorOf<T, U>;
    /**
     * @remarks
     * Invoke the regulator with the given arguments.
     * @param args
     * @returns <Promise<U>>
     */
    invoke(...args: T): Promise<U>;
    /**
     * @remarks
     * Invoke the regulator with the given arguments.
     * This will call the function with the given arguments and return a promise that resolves when all functions are done.
     * Note that order of the results is not same as the order of the arguments.
     * @param items
     */
    invokeAll(items: T[]): Promise<U>[];
}
/**
 * @remarks
 * Get a regulator that allows you to regulate the number of concurrent processes.
 * @param name
 * @returns <RegulatorOf<T, U>>
 */
export declare const Regulator: {
    /**
     * Get a regulator
     * @param name
     * @returns <RegulatorOf<T, U>>
     */
    of: <T extends any[], U>(name: string) => RegulatorOf<T, U>;
};
