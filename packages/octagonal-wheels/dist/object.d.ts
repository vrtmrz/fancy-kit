/**
 * Extracts properties from an object based on a template object.
 * Only properties present in the template object will be included in the result.
 *
 * @template T - The type of the template object.
 * @param {Partial<T>} template - The template object containing the properties to extract.
 * @param {T} obj - The object from which to extract properties.
 * @returns {Partial<T>} - A new object containing the extracted properties.
 */
export declare function extractObject<T>(template: Partial<T>, obj: T): Partial<T>;
/**
 * Checks if two objects are different.
 *
 * @param a - The first object to compare.
 * @param b - The second object to compare.
 * @param ignoreUndefined - Optional. If set to true, undefined properties will be ignored during comparison. Default is false.
 * @returns True if the objects are different, false otherwise.
 */
export declare function isObjectDifferent(a: any, b: any, ignoreUndefined?: boolean): boolean;
export { encodeAnyArray, decodeAnyArray } from "./encoding/encodeobject.ts";
