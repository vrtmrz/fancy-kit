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
function _reactive({ expression, initialValue }) {
    let value;
    let _isDirty = false;
    const changeHandlers = new Set();
    const instance = {
        myContext: new Set(),
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
        get value() {
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
        set value(newValue) {
            if (isObjectDifferent(value, newValue)) {
                value = newValue;
                instance.markDirty();
                instance.rippleChanged();
            }
        },
        onChanged(handler) {
            changeHandlers.add(handler);
            instance.markDirty();
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
//# sourceMappingURL=reactive_v1.js.map
