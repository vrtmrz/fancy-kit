import { FallbackWeakRef } from '../common/polyfill.js';
import { isObjectDifferent } from '../object.js';

// Reactive and less-computing expression evaluator
// Inspired from Vue
let context;
/**
 * Creates a reactive instance with the given initial value.
 *
 * @template T - The type of the reactive instance.
 * @param initialValue - The initial value of the reactive instance.
 * @returns A reactive instance with the given initial value.
 */
function reactiveSource(initialValue) {
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
function reactive(expression, initialValue) {
    return _reactive({ expression, initialValue });
}
const topologicalSortCache = new Map();
// function resetTopologicalSortCache() {
//     topologicalSortCache.clear();
// }
function resetTopologicalSortCacheFor(ids) {
    ids.forEach((id) => topologicalSortCache.delete(id));
    topologicalSortCache.forEach((value, key) => {
        if (!ids.includes(key)) {
            topologicalSortCache.delete(key);
        }
    });
}
function topologicalSort(startNode) {
    if (topologicalSortCache.has(startNode.id)) {
        const ref = topologicalSortCache.get(startNode.id);
        if (ref) {
            const result = ref.map((e) => e.instance.deref()).filter((e) => e);
            if (result.length === ref.length) {
                return result;
            }
            // if not matched, some of the references are already garbage collected, we need to recompute the topological sort
        }
    }
    const visited = new Set();
    const sorted = [];
    const recursionStack = new Set(); // for cycle detection
    function visit(node) {
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
    topologicalSortCache.set(startNode.id, result.map((e) => ({ id: e.id, instance: new FallbackWeakRef(e) })));
    return result; // The order of the sorted array is the order of the dependency
}
let _reactiveSourceId = 0;
function _reactive({ expression, initialValue, isSource }) {
    let value;
    let _isDirty = false;
    const id = _reactiveSourceId++;
    const changeHandlers = new Set();
    const instance = {
        id,
        dependants: new Set(),
        _markDirty() {
            if (_isDirty)
                return;
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
        get value() {
            if (context) {
                if (!instance.dependants.has(context)) {
                    instance.dependants.add(context);
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
        set value(newValue) {
            // If already dirty and it is a source, we do not need to re-evaluate the expression
            // (If it is a source, the source should be unflagged after the value has bee retrieved,
            //  so we do not need to check the difference and raise the change event)
            if (_isDirty && !expression) {
                value = newValue;
            }
            else if (isObjectDifferent(value, newValue)) {
                value = newValue;
                if (!_isDirty) {
                    instance.markDirty();
                    instance.rippleChanged();
                }
            }
        },
        onChanged(handler) {
            changeHandlers.add(handler);
        },
        offChanged(handler) {
            changeHandlers.delete(handler);
        },
    };
    value = initialize();
    function initialize() {
        // Set self to the global variable for tracking the dependency while evaluating the expression
        const previousContext = context;
        context = instance;
        const r = expression ? expression(initialValue) : initialValue;
        context = previousContext;
        return r;
    }
    return instance;
}
/**
 * Creates a computed value based on a reactive expression.
 * @param expression The reactive expression to compute.
 * @returns A function that returns the computed value.
 */
function computed(expression) {
    const v = reactive(expression);
    return () => v.value;
}

export { computed, reactive, reactiveSource };
//# sourceMappingURL=reactive_v2.js.map
