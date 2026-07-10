/**
 * Converts an array into a chunked array.
 * @param arr - The input array.
 * @param chunkLength - The length of each chunk.
 * @returns A generator that yields chunked arrays.
 */
function* arrayToChunkedArray(arr, chunkLength) {
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
function unique(arr) {
    return [...new Set(arr)];
}
/**
 * Generates a sequence of numbers from `from` to `to` (inclusive).
 *
 * @param {number} from - The starting number of the sequence.
 * @param {number} to - The ending number of the sequence.
 * @yields {number} The next number in the sequence.
 */
function* range(from, to) {
    for (let i = from; i <= to; i++) {
        yield i;
    }
    return;
}
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
function createTypedArrayReader(buffer) {
    let offset = 0;
    return {
        read(length) {
            // For performance, bounds are not checked here.
            const result = buffer.slice(offset, offset + length);
            offset += length;
            return result;
        },
        readAll() {
            const result = buffer.slice(offset);
            offset = buffer.length; // Mark all as read
            return result;
        },
    };
}
function concatUInt8Array(arrays) {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const array of arrays) {
        result.set(array, offset);
        offset += array.length;
    }
    return result;
}

export { arrayToChunkedArray, concatUInt8Array, createTypedArrayReader, range, unique };
//# sourceMappingURL=collection.js.map
