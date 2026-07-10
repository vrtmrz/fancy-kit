export type ReactiveChangeHandler<T> = (instance: ReactiveInstance<T>) => unknown;
export type ReactiveExpression<T> = (prev?: T) => T;
export type ReactiveValue<T> = {
    readonly value: T;
    onChanged: (handler: ReactiveChangeHandler<T>) => void;
    offChanged: (handler: ReactiveChangeHandler<T>) => void;
};
export type ReactiveSource<T> = {
    value: T;
    onChanged: (handler: ReactiveChangeHandler<T>) => void;
    offChanged: (handler: ReactiveChangeHandler<T>) => void;
};
export type ReactiveInstance<T> = {
    readonly value: T;
    markDirty(): void;
    rippleChanged(): void;
};
/**
 * Creates a reactive instance with the given initial value.
 *
 * @template T - The type of the reactive instance.
 * @param initialValue - The initial value of the reactive instance.
 * @returns A reactive instance with the given initial value.
 */
export declare function reactiveSource<T>(initialValue: T): ReactiveSource<T>;
/**
 * Creates a reactive value that tracks changes to a given expression.
 *
 * @template T - The type of the reactive value.
 * @param {function(prev?: T): T} expression - The expression to track changes for.
 * @param {T} [initialValue] - The initial value of the reactive value.
 * @returns {ReactiveValue<T>} - The reactive value.
 */
export declare function reactive<T>(expression: (prev?: T) => T, initialValue?: T): ReactiveValue<T>;
/**
 * Creates a computed value based on a reactive expression.
 * @param expression The reactive expression to compute.
 * @returns A function that returns the computed value.
 */
export declare function computed<T>(expression: ReactiveExpression<T>): () => T;
