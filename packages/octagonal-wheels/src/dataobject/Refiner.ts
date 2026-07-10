import { isObjectDifferent } from "../object.ts";
import { type PromiseWithResolvers, promiseWithResolvers, fireAndForget } from "../promises.ts";

/**
 * RefinerOptions interface defines the options for the Refiner class.
 */
export interface RefinerOptions<T, U> {
    /**
     * The function to evaluate the source and return a result.
     * It can be synchronous or asynchronous.
     * @param source - The source value to evaluate.
     * @param previous - The previous result, if any.
     * @returns The result of the evaluation.
     */
    evaluation: (source: T, previous?: U) => Promise<U> | U;
    /**
     * The initial source value to start with.
     */
    initialSource?: T;
    /**
     * A function to determine if the result should be updated based on the source and previous result.
     * @param isDifferent - A boolean indicating if the source is different from the cached source. Derived from isDifferent function.
     * @param source - The new source value.
     * @param previous - The previous result, if any.
     * @returns A boolean indicating if the result should be updated.
     */
    shouldUpdate?: (isDifferent: boolean, source: T, previous?: U) => boolean;
    /**
     * A function to determine if two sources are different.
     * @param a - The first source value.
     * @param b - The second source value.
     * @returns A boolean indicating if the two sources are different.
     * It defaults to isObjectDifferent function.
     * @see isObjectDifferent
     */
    isDifferent?: (a: T, b: T) => boolean;
}

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
export class Refiner<T, U> {
    /**
     * The cached source value used for comparison.
     */
    _cachedBy?: T;
    /**
     * The cached result of the evaluation.
     * It can be undefined if the evaluation has not been performed yet.
     */
    _cachedResult?: U;
    /**
     * The promise with resolvers used to handle the evaluation result.
     */
    _evaluationPromise!: PromiseWithResolvers<U>;
    /**
     * An internal and swappable method used to evaluate the source and return a result.
     */
    __evaluation: (source: T, previous?: U) => Promise<U> | U;
    /**
     * a function to determine if the result should be updated based on the source and previous result.
     * @param isDifferent - A boolean indicating if the source is different from the cached source. Derived from isDifferent function.
     * @param source - The new source value.
     * @param previous - The previous result, if any.
     * @returns a boolean indicating if the result should be updated.
     */
    __shouldUpdate: (isDifferent: boolean, source: T, previous?: U) => boolean = (isDifferent) => isDifferent;

    /**
     * An internal and swappable method function to determine if two sources are different.
     * @param a source value.
     * @param b compare value.
     * @returns a boolean indicating if the two sources are different.
     * It defaults to isObjectDifferent function.
     */
    __isDifferent = (a: T, b: T) => isObjectDifferent(a, b);

    /**
     * An internal method to renew the promise with resolvers.
     * It is called when the evaluation is re-read.
     */
    _refinePromise() {
        const previous = this._evaluationPromise;
        const newPromise = promiseWithResolvers<U>();
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
    constructor({ initialSource: source, evaluation, shouldUpdate, isDifferent }: RefinerOptions<T, U>) {
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
     * An internal variable to track the latest evaluation.
     * It is used to prevent outdated evaluations from being processed.
     */
    _evaluations = Promise.resolve();
    /**
     * An internal variable to track the latest evaluation index.
     * It is used to prevent outdated evaluations from being processed.
     */
    _latest = 0;

    /**
     * An internal method to start the evaluation process.
     * It creates a new promise with resolvers and starts the evaluation.
     * @param source - The source value to evaluate.
     * It starts the evaluation process and caches the result.
     */
    _startEvaluation(source: T) {
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
            } catch (error) {
                evaluationPromise.reject(error);
            }
        };
        // Queue evaluation
        this._evaluations = this._evaluations.then(async () => {
            await proc();
        });
    }
    update(source: T) {
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
        let result: Awaited<U>;
        do {
            // If the result is a special value, we need to re-evaluate the expression
            // This is needed when the evaluation function returns a promise and it is not resolved yet
            try {
                result = await this._evaluationPromise.promise;
                return result;
            } catch (error) {
                if (error !== SHOULD_READ_NEW) {
                    throw error;
                }
                // If the error is a special value, we need to re-evaluate the expression
            }
        } while (true);
    }
    get value(): Promise<U> {
        return this._getValue();
    }
}

export interface RefinerSyncOptions<T, U> {
    evaluation: (source: T, previous?: U) => U;
    initialSource?: T;
    shouldUpdate?: (isDifferent: boolean, source: T, previous?: U) => boolean;
    isDifferent?: (a: T, b: T) => boolean;
}

export class RefinerSync<T, U> {
    _cachedBy?: T;
    _buffedResult?: U | Error;
    _evaluation: (source: T, previous?: U) => U;
    _shouldUpdate: (isDifferent: boolean, source: T, previous?: U) => boolean = (isDifferent) => isDifferent;
    _isDifferent = (a: T, b: T) => isObjectDifferent(a, b);

    constructor({ initialSource: source, evaluation, shouldUpdate, isDifferent }: RefinerSyncOptions<T, U>) {
        this._evaluation = evaluation;
        this._shouldUpdate = shouldUpdate || this._shouldUpdate;
        this._isDifferent = isDifferent || this._isDifferent;
        if (source !== undefined) {
            this._startEvaluation(source);
        }
    }
    _startEvaluation(source: T) {
        const _buff = this._buffedResult instanceof Error ? undefined : this._buffedResult;
        const _source = source;
        try {
            const r = this._evaluation(_source, _buff);
            this._cachedBy = _source;
            this._buffedResult = r;
        } catch (error) {
            this._cachedBy = _source;
            this._buffedResult = error as Error;
        }
    }
    update(source: T) {
        const isDifferent = this._cachedBy !== undefined ? this._isDifferent(this._cachedBy, source) : true;
        const buff = this._buffedResult instanceof Error ? undefined : this._buffedResult;
        if (!this._shouldUpdate(isDifferent, source, buff)) {
            return this;
        }
        this._startEvaluation(source);
        return this;
    }
    get value(): U | undefined {
        if (this._buffedResult instanceof Error) {
            throw this._buffedResult;
        }
        return this._buffedResult;
    }
}
