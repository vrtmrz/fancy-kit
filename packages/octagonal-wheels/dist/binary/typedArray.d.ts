/**
 * Represents a reader interface for typed arrays, providing methods to read a specified number of elements or all elements.
 *
 * @template T The type of the elements returned by the reader.
 * @property read Reads a specified number of elements from the array.
 * @param length The number of elements to read.
 * @returns The read elements of type T.
 * @property readAll Reads all elements from the array.
 * @returns All elements of type T.
 */
export type TypedArrayReader<T> = {
    read: (length: number) => T;
    readAll: () => T;
};
type TypedArrays = Uint8Array | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array;
/**
 * Creates a reader for a given typed array buffer, allowing sequential reading of slices.
 *
 * @template T - The type of the typed array (e.g., Uint8Array, Float32Array).
 * @param buffer - The typed array buffer to read from.
 * @returns An object with methods to read a specified number of elements or all remaining elements from the buffer.
 *
 * @example
 * ```typescript
 * const reader = createTypedArrayReader(new Uint8Array([1, 2, 3, 4]));
 * const firstTwo = reader.read(2); // Uint8Array [1, 2]
 * const rest = reader.readAll();   // Uint8Array [3, 4]
 * ```
 */
export declare function createTypedArrayReader<T extends TypedArrays>(buffer: T): TypedArrayReader<T>;
/**
 * Concatenates multiple Uint8Array arrays into a single Uint8Array.
 *
 * @param arrays - An array of Uint8Array arrays to be concatenated.
 * @returns A new Uint8Array containing the concatenated values.
 */
export declare function concatUInt8Array(arrays: Uint8Array[]): Uint8Array<ArrayBuffer>;
export {};
