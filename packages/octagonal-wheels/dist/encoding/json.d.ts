/**
 * Recursively retains JSON-data properties and rejects non-data values.
 *
 * Ordinary interfaces, optional properties, readonly arrays, and tuples retain
 * their shape without requiring a string index signature. This is a compile-time
 * constraint; numbers still admit NaN and infinities, and cycles are not detected.
 *
 * @typeParam T - The input shape whose properties are checked recursively.
 */
export type JsonCompatible<T> = T extends string | number | boolean | null ? T : T extends ((...args: never[]) => unknown) | (abstract new (...args: never[]) => unknown) ? never : T extends readonly unknown[] ? {
    [K in keyof T]: JsonCompatible<T[K]>;
} : T extends object ? {
    [K in keyof T]: JsonCompatible<T[K]>;
} : never;
/**
 * Clones JSON data by serialising it and parsing the resulting text.
 *
 * @typeParam T - JSON-data input, checked recursively for unsupported values.
 * @typeParam U - Caller-selected output type; defaults to the input type.
 * @param value - JSON data to serialise and parse.
 * @returns The parsed JSON representation. An explicit U is a caller assertion,
 * not a runtime conversion or validation of that type.
 * @throws TypeError When native JSON serialisation rejects the runtime value,
 * such as for a circular reference or an unhandled bigint.
 * @throws SyntaxError When serialisation returns no JSON text and parsing fails.
 * @remarks
 * The constraint rejects Date, functions, bigint, symbols, and root undefined
 * in typed calls. Runtime behaviour remains native JSON.parse(JSON.stringify()).
 * JavaScript callers and explicit assertions can bypass the constraint. Values
 * outside JSON's representable range retain native behaviour: NaN and infinities
 * become null. Prototypes and shared references are not preserved; runtime
 * undefined object fields disappear and toJSON hooks still run if supplied.
 */
export declare function cloneViaJSON<T, U = T>(value: T & JsonCompatible<T>): U;
