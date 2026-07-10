// Reactive and less-computing expression evaluator
// Inspired from Vue

import { isObjectDifferent } from "../object.ts";

let context: ReactiveInstance<any> | undefined;
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
export function reactiveSource<T>(initialValue: T): ReactiveSource<T> {
    return _reactive({ initialValue });
}
/**
 * Creates a reactive value that tracks changes to a given expression.
 *
 * @template T - The type of the reactive value.
 * @param {function(prev?: T): T} expression - The expression to track changes for.
 * @param {T} [initialValue] - The initial value of the reactive value.
 * @returns {ReactiveValue<T>} - The reactive value.
 */
export function reactive<T>(expression: (prev?: T) => T, initialValue?: T): ReactiveValue<T> {
    return _reactive({ expression, initialValue });
}
type reactiveParams<T> =
    | {
          expression: (prev?: T) => T;
          initialValue?: T;
      }
    | {
          expression?: (prev?: T) => T;
          initialValue: T;
      };

function _reactive<T>({ expression, initialValue }: reactiveParams<T>): ReactiveValue<T> {
    let value: T;
    let _isDirty = false;

    const changeHandlers = new Set<(value: ReactiveInstance<T>) => unknown>();

    const instance = {
        myContext: new Set<ReactiveInstance<unknown>>(),
        markDirty() {
            _isDirty = true;
            instance.markDependedDirty();
        },
        rippleChanged() {
            changeHandlers.forEach((e) => e(instance));
            instance.myContext.forEach((e) => e.rippleChanged());
        },
        markClean() {
            _isDirty = false;
        },
        markDependedDirty() {
            instance.myContext.forEach((e) => e.markDirty());
        },
        get isDirty() {
            return _isDirty;
        },
        get value(): T {
            if (context) {
                instance.myContext.add(context);
                // instance.markDirty(true);
            }
            if (!expression) {
                return value;
            }
            if (_isDirty) {
                const oldValue = value;
                const newValue = expression();
                if (isObjectDifferent(oldValue, newValue)) {
                    value = newValue;
                    instance.markClean();
                    instance.markDependedDirty();
                }
            }
            return value;
        },
        set value(newValue: T) {
            if (isObjectDifferent(value, newValue)) {
                value = newValue;
                instance.markDirty();
                instance.rippleChanged();
            }
        },
        onChanged(handler: ReactiveChangeHandler<T>) {
            changeHandlers.add(handler);
            instance.markDirty();
        },
        offChanged(handler: ReactiveChangeHandler<T>) {
            changeHandlers.delete(handler);
        },
    };

    value = initialize();

    function initialize(): T {
        // Set self to the global variable for tracking the dependency while evaluating the expression
        const previousContext = context;
        context = instance;
        const r = expression ? expression(initialValue) : initialValue;
        context = previousContext;
        return r as T;
    }

    return instance;
}

/**
 * Creates a computed value based on a reactive expression.
 * @param expression The reactive expression to compute.
 * @returns A function that returns the computed value.
 */
export function computed<T>(expression: ReactiveExpression<T>): () => T {
    const v = reactive(expression);
    return () => v.value;
}
