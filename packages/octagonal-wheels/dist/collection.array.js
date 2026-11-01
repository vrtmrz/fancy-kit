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

export { arrayToChunkedArray, range, unique };
//# sourceMappingURL=collection.array.js.map
