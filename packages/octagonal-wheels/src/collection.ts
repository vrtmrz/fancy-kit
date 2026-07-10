/**
 * Converts an array into a chunked array.
 * @param arr - The input array.
 * @param chunkLength - The length of each chunk.
 * @returns A generator that yields chunked arrays.
 */
export function* arrayToChunkedArray<T>(arr: T[], chunkLength: number): Generator<T[], void, unknown> {
    const source = [...arr];
    while (source.length) {
        const s = source.splice(0, chunkLength);
        yield s;
    }
}

/**
 * Returns an array with unique elements from the input array.
 *
 * @template T - The type of elements in the array.
 * @param {T[]} arr - The input array.
 * @returns {T[]} - An array with unique elements.
 */
export function unique<T>(arr: T[]): T[] {
    return [...new Set<T>(arr)];
}

/**
 * Generates a sequence of numbers from `from` to `to` (inclusive).
 *
 * @param {number} from - The starting number of the sequence.
 * @param {number} to - The ending number of the sequence.
 * @yields {number} The next number in the sequence.
 */
export function* range(from: number, to: number) {
    for (let i = from; i <= to; i++) {
        yield i;
    }
    return;
}
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

type TypedArrays =
    | Uint8Array
    | Int8Array
    | Uint16Array
    | Int16Array
    | Uint32Array
    | Int32Array
    | Float32Array
    | Float64Array;

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
export function createTypedArrayReader<T extends TypedArrays>(buffer: T): TypedArrayReader<T> {
    let offset = 0;
    return {
        read(length: number): T {
            // For performance, bounds are not checked here.
            const result = buffer.slice(offset, offset + length);
            offset += length;
            return result as T;
        },
        readAll(): T {
            const result = buffer.slice(offset);
            offset = buffer.length; // Mark all as read
            return result as T;
        },
    };
}

export function concatUInt8Array(arrays: Uint8Array[]): Uint8Array<ArrayBuffer> {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const array of arrays) {
        result.set(array, offset);
        offset += array.length;
    }
    return result;
}
