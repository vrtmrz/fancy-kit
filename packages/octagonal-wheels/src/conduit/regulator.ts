/*
Regulator 
*/
import { promiseWithResolvers, type PromiseWithResolvers } from "../promises.ts";
import { NamedInstance } from "./NamedInstance.ts";
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
 * Create a regulator
 * @param _name
 * @returns return a regulator
 */
function createRegulator<T extends any[], U>(_name: string): RegulatorOf<T, U> {
    let maxConcurrency = 1;
    let onProcess: (...args: T) => Promise<U> = () => {
        throw new Error(`not function connected on Regulator:${_name}`);
    };
    const processing = new Set<Promise<U>>();
    const scheduled = [] as [T, PromiseWithResolvers<U>][];
    // let currentCount = 0;
    let pumping = false;
    const pump = async () => {
        /* istanbul ignore if -- @preserve */
        if (pumping) {
            // Safety check to prevent multiple pumps
            // Basically already checked during the startPumping
            /* istanbul ignore  -- @preserve */
            return;
        }
        try {
            pumping = true;
            do {
                if (maxConcurrency <= 0) {
                    return;
                }
                while (processing.size >= maxConcurrency) {
                    if (maxConcurrency <= 0) {
                        return;
                    }
                    // wait for any processing to finish
                    await Promise.race(processing);
                }
                const [args, pw] = scheduled.shift()!;
                const task = new Promise<U>((res, rej) => {
                    try {
                        res(onProcess(...args));
                    } catch (e) {
                        rej(e);
                    }
                });
                processing.add(task);
                task.then((result) => {
                    processing.delete(task);
                    pw.resolve(result);
                }).catch((err) => {
                    processing.delete(task);
                    pw.reject(err);
                });
            } while (scheduled.length > 0);
        } finally {
            pumping = false;
        }
    };
    const startPumping = () => {
        if (pumping || scheduled.length === 0) {
            return;
        }
        // fireAndForget(async () => await pump());
        void pump();
    };
    const schedule = (arg: T) => {
        const pw = promiseWithResolvers<U>();
        scheduled.push([arg, pw]);
        startPumping();
        return pw.promise;
    };
    const reg: RegulatorOf<T, U> = {
        maxConcurrency: (n: number) => {
            maxConcurrency = n;
            startPumping();
            return reg;
        },
        onProcess: (func: (...args: T) => Promise<U>) => {
            onProcess = func;
            startPumping();
            return reg;
        },
        invoke: (...args: T) => {
            const p = schedule(args);
            return p;
        },
        invokeAll: (items: T[]) => {
            return items.map((item) => schedule(item));
        },
    };
    return reg;
}
const regulators = new NamedInstance<RegulatorOf<any, any>>("Regulator", (name) => createRegulator(name));
/**
 * @remarks
 * Get a regulator that allows you to regulate the number of concurrent processes.
 * @param name
 * @returns <RegulatorOf<T, U>>
 */
export const Regulator = {
    /**
     * Get a regulator
     * @param name
     * @returns <RegulatorOf<T, U>>
     */
    of: <T extends any[], U>(name: string): RegulatorOf<T, U> => {
        return regulators.of(name);
    },
};
