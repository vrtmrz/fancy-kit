import { promiseWithResolvers } from '../promises.js';
import { NamedInstance } from './NamedInstance.js';

/*
Regulator
*/
/**
 * @remarks
 * Create a regulator
 * @param _name
 * @returns return a regulator
 */
function createRegulator(_name) {
    let maxConcurrency = 1;
    let onProcess = () => {
        throw new Error(`not function connected on Regulator:${_name}`);
    };
    const processing = new Set();
    const scheduled = [];
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
                const [args, pw] = scheduled.shift();
                const task = new Promise((res, rej) => {
                    try {
                        res(onProcess(...args));
                    }
                    catch (e) {
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
        }
        finally {
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
    const schedule = (arg) => {
        const pw = promiseWithResolvers();
        scheduled.push([arg, pw]);
        startPumping();
        return pw.promise;
    };
    const reg = {
        maxConcurrency: (n) => {
            maxConcurrency = n;
            startPumping();
            return reg;
        },
        onProcess: (func) => {
            onProcess = func;
            startPumping();
            return reg;
        },
        invoke: (...args) => {
            const p = schedule(args);
            return p;
        },
        invokeAll: (items) => {
            return items.map((item) => schedule(item));
        },
    };
    return reg;
}
const regulators = new NamedInstance("Regulator", (name) => createRegulator(name));
/**
 * @remarks
 * Get a regulator that allows you to regulate the number of concurrent processes.
 * @param name
 * @returns <RegulatorOf<T, U>>
 */
const Regulator = {
    /**
     * Get a regulator
     * @param name
     * @returns <RegulatorOf<T, U>>
     */
    of: (name) => {
        return regulators.of(name);
    },
};

export { Regulator };
//# sourceMappingURL=regulator.js.map
