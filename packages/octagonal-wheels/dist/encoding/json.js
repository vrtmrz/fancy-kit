/**
 * Clones a value by serialising it to JSON and parsing the resulting text.
 *
 * @param value - The value to serialise and parse.
 * @returns The parsed JSON representation. The result is `unknown` because
 * serialisation can change or omit values and can invoke `toJSON` methods.
 * @throws {@link TypeError} When native JSON serialisation rejects the value,
 * such as for a circular reference or an unhandled `bigint`.
 * @throws {@link SyntaxError} When serialisation returns no JSON text, such as
 * for top-level `undefined`, and parsing therefore fails.
 * @remarks This uses native `JSON.parse(JSON.stringify(value))` semantics. It
 * does not preserve prototypes, shared references, `undefined` object fields,
 * or non-finite numbers (`NaN` and infinities become `null`).
 */
function cloneViaJSON(value) {
    return JSON.parse(JSON.stringify(value));
}

export { cloneViaJSON };
//# sourceMappingURL=json.js.map
