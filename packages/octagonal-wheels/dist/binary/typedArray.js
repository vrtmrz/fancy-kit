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
/**
 * Concatenates multiple Uint8Array arrays into a single Uint8Array.
 *
 * @param arrays - An array of Uint8Array arrays to be concatenated.
 * @returns A new Uint8Array containing the concatenated values.
 */
function concatUInt8Array(arrays) {
    const length = arrays.reduce((acc, cur) => acc + cur.length, 0);
    const result = new Uint8Array(length);
    let pos = 0;
    for (const array of arrays) {
        result.set(array, pos);
        pos += array.length;
    }
    return result;
}

export { concatUInt8Array, createTypedArrayReader };
//# sourceMappingURL=typedArray.js.map
