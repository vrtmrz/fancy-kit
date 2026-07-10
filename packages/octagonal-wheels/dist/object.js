export { decodeAnyArray, encodeAnyArray } from './encoding/encodeobject.js';

/**
 * Extracts properties from an object based on a template object.
 * Only properties present in the template object will be included in the result.
 *
 * @template T - The type of the template object.
 * @param {Partial<T>} template - The template object containing the properties to extract.
 * @param {T} obj - The object from which to extract properties.
 * @returns {Partial<T>} - A new object containing the extracted properties.
 */
function extractObject(template, obj) {
    const ret = { ...template };
    for (const key in ret) {
        ret[key] = obj[key];
    }
    return ret;
}
const SYMBOL_A = Symbol("a");
const SYMBOL_B = Symbol("b");
/**
 * Checks if two objects are different.
 *
 * @param a - The first object to compare.
 * @param b - The second object to compare.
 * @param ignoreUndefined - Optional. If set to true, undefined properties will be ignored during comparison. Default is false.
 * @returns True if the objects are different, false otherwise.
 */
function isObjectDifferent(a, b, ignoreUndefined = false) {
    if (typeof a !== typeof b) {
        return true;
    }
    if (typeof a === "object") {
        if (a === null || b === null) {
            return a !== b;
        }
        const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
        if (ignoreUndefined) {
            return keys
                .map((key) => a?.[key] !== undefined && b?.[key] !== undefined && isObjectDifferent(a?.[key], b?.[key]))
                .some((e) => e == true);
        }
        return keys
            .map((key) => isObjectDifferent(key in a ? a[key] : SYMBOL_A, key in b ? b[key] : SYMBOL_B))
            .some((e) => e == true);
    }
    else {
        return a !== b;
    }
}

export { extractObject, isObjectDifferent };
//# sourceMappingURL=object.js.map
