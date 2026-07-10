import { isObjectDifferent } from '../object.js';
import { promiseWithResolvers, fireAndForget } from '../promises.js';

// * A special symbol used to indicate that the evaluation should be re-read.
const SHOULD_READ_NEW = Symbol("SHOULD_READ_NEW");
const NOT_USED = Symbol("NOT_USED");
/**
 * Refiner class is a utility for evaluating and caching results based on a source value.
 * It can handle both synchronous and asynchronous evaluations.
 * To address the issue of performance, it uses no `#` properties. Do not call `_` prefixed methods directly.
 * This class is designed for:
 * - Reactive updates or subscriptions.
 * Not designed for:
 * - Caching computed values based on arguments. (Use Computed for that).
 * @template T - The type of the source value.
 * @template U - The type of the result value.
 * @see RefinerOptions
 */
class Refiner {
    /**
     * An internal method to renew the promise with resolvers.
     * It is called when the evaluation is re-read.
     */
    _refinePromise() {
        const previous = this._evaluationPromise;
        const newPromise = promiseWithResolvers();
        this._evaluationPromise = newPromise;
        fireAndForget(async () => {
            await Promise.race([previous.promise, Promise.resolve(NOT_USED)]).then((r) => {
                if (r === NOT_USED) {
                    previous.reject(SHOULD_READ_NEW);
                    return;
                }
            });
        });
        return newPromise;
    }
    /**
     * Constructor for the Refiner class.
     * @param options - The options for the Refiner instance.
     */
    constructor({ initialSource: source, evaluation, shouldUpdate, isDifferent }) {
        /**
         * The cached source value used for comparison.
         */
        Object.defineProperty(this, "_cachedBy", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * The cached result of the evaluation.
         * It can be undefined if the evaluation has not been performed yet.
         */
        Object.defineProperty(this, "_cachedResult", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * The promise with resolvers used to handle the evaluation result.
         */
        Object.defineProperty(this, "_evaluationPromise", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * An internal and swappable method used to evaluate the source and return a result.
         */
        Object.defineProperty(this, "__evaluation", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * a function to determine if the result should be updated based on the source and previous result.
         * @param isDifferent - A boolean indicating if the source is different from the cached source. Derived from isDifferent function.
         * @param source - The new source value.
         * @param previous - The previous result, if any.
         * @returns a boolean indicating if the result should be updated.
         */
        Object.defineProperty(this, "__shouldUpdate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (isDifferent) => isDifferent
        });
        /**
         * An internal and swappable method function to determine if two sources are different.
         * @param a source value.
         * @param b compare value.
         * @returns a boolean indicating if the two sources are different.
         * It defaults to isObjectDifferent function.
         */
        Object.defineProperty(this, "__isDifferent", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (a, b) => isObjectDifferent(a, b)
        });
        /**
         * An internal variable to track the latest evaluation.
         * It is used to prevent outdated evaluations from being processed.
         */
        Object.defineProperty(this, "_evaluations", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: Promise.resolve()
        });
        /**
         * An internal variable to track the latest evaluation index.
         * It is used to prevent outdated evaluations from being processed.
         */
        Object.defineProperty(this, "_latest", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        this.__evaluation = evaluation;
        this.__shouldUpdate = shouldUpdate || this.__shouldUpdate;
        this.__isDifferent = isDifferent || this.__isDifferent;
        // Initialize the promise with resolvers
        this._refinePromise();
        if (source !== undefined) {
            this._startEvaluation(source);
        }
    }
    /**
     * An internal method to start the evaluation process.
     * It creates a new promise with resolvers and starts the evaluation.
     * @param source - The source value to evaluate.
     * It starts the evaluation process and caches the result.
     */
    _startEvaluation(source) {
        // Preventing multiple evaluations at the same time
        const _buff = this._cachedResult;
        const _source = source;
        const index = ++this._latest;
        const evaluationPromise = this._refinePromise();
        const proc = async () => {
            if (this._latest > index) {
                // If the evaluation is outdated, return
                return;
            }
            try {
                const r = await this.__evaluation(_source, _buff);
                // If successful, cache the result and its source, and resolve the promise
                if (this._latest <= index) {
                    // If the evaluation result is outdated, preventing caching it
                    // (We have used them to check if the evaluation is outdated on `update`, subsequent `proc`s are dependent on them.
                    // And queued items also depend on them at the time of their creation)
                    this._cachedBy = _source;
                    this._cachedResult = r;
                    // However, some `await` may be waiting for the result, so we need to resolve it
                }
                evaluationPromise.resolve(r);
            }
            catch (error) {
                evaluationPromise.reject(error);
            }
        };
        // Queue evaluation
        this._evaluations = this._evaluations.then(async () => {
            await proc();
        });
    }
    update(source) {
        const isDifferent = this._cachedBy !== undefined ? this.__isDifferent(this._cachedBy, source) : true;
        if (!this.__shouldUpdate(isDifferent, source, this._cachedResult)) {
            // No change, no need to recompute
            return this;
        }
        // This methods should be called when the source is changed
        // Should be synchronous, so we can use the result immediately
        this._startEvaluation(source);
        return this;
    }
    async _getValue() {
        let result;
        do {
            // If the result is a special value, we need to re-evaluate the expression
            // This is needed when the evaluation function returns a promise and it is not resolved yet
            try {
                result = await this._evaluationPromise.promise;
                return result;
            }
            catch (error) {
                if (error !== SHOULD_READ_NEW) {
                    throw error;
                }
                // If the error is a special value, we need to re-evaluate the expression
            }
        } while (true);
    }
    get value() {
        return this._getValue();
    }
}
class RefinerSync {
    constructor({ initialSource: source, evaluation, shouldUpdate, isDifferent }) {
        Object.defineProperty(this, "_cachedBy", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_buffedResult", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_evaluation", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_shouldUpdate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (isDifferent) => isDifferent
        });
        Object.defineProperty(this, "_isDifferent", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (a, b) => isObjectDifferent(a, b)
        });
        this._evaluation = evaluation;
        this._shouldUpdate = shouldUpdate || this._shouldUpdate;
        this._isDifferent = isDifferent || this._isDifferent;
        if (source !== undefined) {
            this._startEvaluation(source);
        }
    }
    _startEvaluation(source) {
        const _buff = this._buffedResult instanceof Error ? undefined : this._buffedResult;
        const _source = source;
        try {
            const r = this._evaluation(_source, _buff);
            this._cachedBy = _source;
            this._buffedResult = r;
        }
        catch (error) {
            this._cachedBy = _source;
            this._buffedResult = error;
        }
    }
    update(source) {
        const isDifferent = this._cachedBy !== undefined ? this._isDifferent(this._cachedBy, source) : true;
        const buff = this._buffedResult instanceof Error ? undefined : this._buffedResult;
        if (!this._shouldUpdate(isDifferent, source, buff)) {
            return this;
        }
        this._startEvaluation(source);
        return this;
    }
    get value() {
        if (this._buffedResult instanceof Error) {
            throw this._buffedResult;
        }
        return this._buffedResult;
    }
}

export { Refiner, RefinerSync };
//# sourceMappingURL=Refiner.js.map
