import { type PromiseWithResolvers } from "../promises.ts";
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
export declare class Refiner<T, U> {
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
    _evaluationPromise: PromiseWithResolvers<U>;
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
    __shouldUpdate: (isDifferent: boolean, source: T, previous?: U) => boolean;
    /**
     * An internal and swappable method function to determine if two sources are different.
     * @param a source value.
     * @param b compare value.
     * @returns a boolean indicating if the two sources are different.
     * It defaults to isObjectDifferent function.
     */
    __isDifferent: (a: T, b: T) => boolean;
    /**
     * An internal method to renew the promise with resolvers.
     * It is called when the evaluation is re-read.
     */
    _refinePromise(): {
        promise: Promise<U>;
        resolve: (value: U | PromiseLike<U>) => void;
        reject: (reason?: any) => void;
    };
    /**
     * Constructor for the Refiner class.
     * @param options - The options for the Refiner instance.
     */
    constructor({ initialSource: source, evaluation, shouldUpdate, isDifferent }: RefinerOptions<T, U>);
    /**
     * An internal variable to track the latest evaluation.
     * It is used to prevent outdated evaluations from being processed.
     */
    _evaluations: Promise<void>;
    /**
     * An internal variable to track the latest evaluation index.
     * It is used to prevent outdated evaluations from being processed.
     */
    _latest: number;
    /**
     * An internal method to start the evaluation process.
     * It creates a new promise with resolvers and starts the evaluation.
     * @param source - The source value to evaluate.
     * It starts the evaluation process and caches the result.
     */
    _startEvaluation(source: T): void;
    update(source: T): this;
    _getValue(): Promise<U>;
    get value(): Promise<U>;
}
export interface RefinerSyncOptions<T, U> {
    evaluation: (source: T, previous?: U) => U;
    initialSource?: T;
    shouldUpdate?: (isDifferent: boolean, source: T, previous?: U) => boolean;
    isDifferent?: (a: T, b: T) => boolean;
}
export declare class RefinerSync<T, U> {
    _cachedBy?: T;
    _buffedResult?: U | Error;
    _evaluation: (source: T, previous?: U) => U;
    _shouldUpdate: (isDifferent: boolean, source: T, previous?: U) => boolean;
    _isDifferent: (a: T, b: T) => boolean;
    constructor({ initialSource: source, evaluation, shouldUpdate, isDifferent }: RefinerSyncOptions<T, U>);
    _startEvaluation(source: T): void;
    update(source: T): this;
    get value(): U | undefined;
}
