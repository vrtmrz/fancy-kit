// Reactive and less-computing expression evaluator
// Inspired from Vue

import { FallbackWeakRef } from "../common/polyfill.ts";
import { isObjectDifferent } from "../object.ts";

let context: InternalReactiveInstance<any> | undefined;
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
    markClean(): void;
    rippleChanged(): void;
};
type InternalReactiveInstance<T> = ReactiveInstance<T> & {
    readonly isDirty: boolean;
    readonly id: number;
    dependants: Set<InternalReactiveInstance<unknown>>;
    _markDirty(): void;
    _rippleChanged(): void;
    onChanged(handler: ReactiveChangeHandler<T>): void;
    offChanged(handler: ReactiveChangeHandler<T>): void;
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
          isSource?: boolean;
      }
    | {
          expression?: (prev?: T) => T;
          initialValue: T;
          isSource?: boolean;
      };

type RefReactiveInstance<T> = {
    id: number;
    instance: FallbackWeakRef<InternalReactiveInstance<T>>;
};
const topologicalSortCache = new Map<number, RefReactiveInstance<unknown>[]>();

// function resetTopologicalSortCache() {
//     topologicalSortCache.clear();
// }

function resetTopologicalSortCacheFor(ids: number[]) {
    ids.forEach((id) => topologicalSortCache.delete(id));
    topologicalSortCache.forEach((value, key) => {
        if (!ids.includes(key)) {
            topologicalSortCache.delete(key);
        }
    });
}
function topologicalSort(startNode: InternalReactiveInstance<unknown>): InternalReactiveInstance<unknown>[] {
    if (topologicalSortCache.has(startNode.id)) {
        const ref = topologicalSortCache.get(startNode.id);
        if (ref) {
            const result = ref.map((e) => e.instance.deref()).filter((e) => e) as InternalReactiveInstance<unknown>[];
            if (result.length === ref.length) {
                return result;
            }
            // if not matched, some of the references are already garbage collected, we need to recompute the topological sort
        }
    }
    const visited = new Set<InternalReactiveInstance<unknown>>();
    const sorted: InternalReactiveInstance<unknown>[] = [];
    const recursionStack = new Set<ReactiveInstance<unknown>>(); // for cycle detection

    function visit(node: InternalReactiveInstance<unknown>) {
        if (visited.has(node)) {
            return;
        }
        if (recursionStack.has(node)) {
            // Circular dependency detected, throw an error, we can't resolve this
            throw new Error("Circular dependency detected!");
        }
        visited.add(node);
        recursionStack.add(node);
        for (const dependant of node.dependants) {
            visit(dependant);
        }
        sorted.push(node);
        recursionStack.delete(node);
    }

    visit(startNode);
    const result = sorted.reverse();
    topologicalSortCache.set(
        startNode.id,
        result.map((e) => ({ id: e.id, instance: new FallbackWeakRef(e) }))
    );
    return result; // The order of the sorted array is the order of the dependency
}

let _reactiveSourceId = 0;
function _reactive<T>({ expression, initialValue, isSource }: reactiveParams<T>): ReactiveValue<T> {
    let value: T;
    let _isDirty = false;
    const id = _reactiveSourceId++;
    const changeHandlers = new Set<(value: ReactiveInstance<T>) => unknown>();

    const instance: InternalReactiveInstance<T> = {
        id,
        dependants: new Set<InternalReactiveInstance<unknown>>(),
        _markDirty() {
            if (_isDirty) return;
            _isDirty = true;
        },
        markDirty() {
            const sorted = topologicalSort(instance);
            sorted.forEach((node) => node._markDirty());
        },
        _rippleChanged() {
            changeHandlers.forEach((e) => e(instance));
        },
        rippleChanged() {
            const sorted = topologicalSort(instance);
            sorted.forEach((node) => node._rippleChanged());
        },
        markClean() {
            _isDirty = false;
        },
        get isDirty() {
            return _isDirty;
        },
        get value(): T {
            if (context) {
                if (!instance.dependants.has(context as InternalReactiveInstance<unknown>)) {
                    instance.dependants.add(context as InternalReactiveInstance<unknown>);
                    resetTopologicalSortCacheFor([instance.id, context.id]);
                }
            }
            if (_isDirty) {
                // if it has been marked dirty, we need to re-evaluate the expression (if supplied)
                // If not (means it is a source), indeed we do not need to re-evaluate the expression. But should un-flag it.
                if (expression) {
                    const oldValue = value;
                    const newValue = expression();
                    if (isObjectDifferent(oldValue, newValue)) {
                        value = newValue;
                    }
                }
                // After re-evaluating the expression, we mark it clean
                instance.markClean();
            }
            return value;
        },
        set value(newValue: T) {
            // If already dirty and it is a source, we do not need to re-evaluate the expression
            // (If it is a source, the source should be unflagged after the value has bee retrieved,
            //  so we do not need to check the difference and raise the change event)
            if (_isDirty && !expression) {
                value = newValue;
            } else if (isObjectDifferent(value, newValue)) {
                value = newValue;
                if (!_isDirty) {
                    instance.markDirty();
                    instance.rippleChanged();
                }
            }
        },
        onChanged(handler: ReactiveChangeHandler<T>) {
            changeHandlers.add(handler);
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

    return instance as ReactiveValue<T>;
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
