/**
 * A class that computes a value based on provided arguments and caches the result.
 * The computation is only re-evaluated when the arguments change or when a forced update is requested.
 * Mostly similar to 'Refiner', but simpler implementation and features.
 * This class is designed for:
 * - Caching computed values based on arguments.
 * Not designed for:
 * - Reactive updates or subscriptions. (Use Refiner for that).
 */
class Computed {
    /**
     * Creates an instance of Computed.
     * @param params - Parameters for the Computed instance.
     * @param params.evaluation - Function to compute the value.
     * @param params.requiresUpdate - Optional function to determine if a forced update is needed.
     */
    constructor(params) {
        /**
         * Previous arguments used for computation.
         */
        Object.defineProperty(this, "_previousArgs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /**
         * Previous result of the computation.
         */
        Object.defineProperty(this, "_previousResult", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /**
         * Function to compute the value based on provided arguments.
         */
        Object.defineProperty(this, "_evaluation", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * Function to compare two arguments for equality.
         * @param a - The first argument.
         * @param b - The second argument.
         * @returns True if the arguments are equal, false otherwise.
         */
        Object.defineProperty(this, "_isEqual", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (a, b) => this._areArgsEqual(a, b)
        });
        /**
         * Function to determine if a forced update is needed.
         * @param args - Current arguments.
         * @param previousArgs - Previous arguments.
         * @param previousResult - Previous result.
         * @returns {Promise<boolean> | boolean} True if a forced update is needed, false otherwise. (in that case, the difference of args is still checked)
         */
        Object.defineProperty(this, "_shouldForceUpdate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_updating", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: Promise.resolve()
        });
        this._evaluation = params.evaluation;
        this._shouldForceUpdate = params.requiresUpdate || (() => false);
        if (params.isEqual) {
            this._isEqual = params.isEqual;
        }
    }
    /**
     * Updates the computed value if necessary.
     * if requiresUpdate and  throws something, this method will reject with that error.
     * @param args - The current arguments.
     * @returns {Promise<boolean>} True if the value was updated, false otherwise.
     */
    updateValue(...args) {
        return new Promise((resolve, reject) => {
            this._updating = this._updating.then(async () => {
                try {
                    const forceUpdate = await this._shouldForceUpdate(args, this._previousArgs, this._previousResult);
                    if (!forceUpdate) {
                        // if not forced update, check if args are the same as previous
                        if (this._previousArgs && this._isEqual(args, this._previousArgs)) {
                            // If args are the same, use previous result, no need to re-evaluate, and no need to keep args/result
                            return resolve(false);
                        }
                    }
                    try {
                        // Otherwise, evaluate the new result
                        this._previousResult = await this._evaluation(...args);
                    }
                    catch (error) {
                        // If evaluation fails, store the error as the result
                        const err = error instanceof Error ? error : new Error(String(error));
                        this._previousResult = err;
                    }
                    finally {
                        // Always update previous args, even if evaluation fails (this prevents repeated failed evaluations, which may be desired behavior)
                        this._previousArgs = args;
                    }
                    return resolve(true);
                }
                catch (error) {
                    return reject(error);
                }
            });
        });
    }
    /**
     * Resets the cached arguments and result.
     * If called, the next update will always re-evaluate the computation.
     */
    reset() {
        this._previousArgs = null;
        this._previousResult = null;
    }
    /**
     * Updates the computed value and returns the instance.
     * (Convenience method)
     * @param args - The current arguments.
     * @returns {Promise<ResolvedComputed<T, U>>} The Computed instance (but value is guaranteed to be resolved).
     */
    async update(...args) {
        await this.updateValue(...args);
        return this;
    }
    /**
     * Gets the current computed value. if the last evaluation resulted in an error, it throws that error.
     * If never evaluated, it returns null. (because we cannot define a default value).
     * @returns {U} The computed value.
     */
    get value() {
        if (this._previousResult instanceof Error) {
            throw this._previousResult;
        }
        return this._previousResult;
    }
    /**
     * Checks if two sets of arguments are equal by comparing their JSON string representations. (Base implementation).
     * @param args1 - The first set of arguments.
     * @param args2 - The second set of arguments.
     * @returns {boolean} True if the arguments are equal, false otherwise.
     */
    _areArgsEqual(args1, args2) {
        return JSON.stringify(args1) === JSON.stringify(args2);
    }
}

export { Computed };
//# sourceMappingURL=Computed.js.map
