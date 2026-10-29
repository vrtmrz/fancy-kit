/**
 * Replaces all occurrences of a substring in a string with a new substring.
 * If the `replaceAll` method is available, it uses that method. Otherwise, it splits the string and joins it with the new substring.
 *
 * @param {string} str - The original string.
 * @param {string} search - The substring to be replaced.
 * @param {string} replace - The new substring to replace the occurrences of `search`.
 * @returns {string} The modified string with all occurrences of `search` replaced by `replace`.
 */
export declare function replaceAll(str: string, search: string, replace: string): string;
/**
 * Replaces all occurrences of multiple pairs of substrings in a string.
 *
 * @param str - The input string.
 * @param fromTo - An array of tuples representing the pairs of substrings to be replaced.
 * Each tuple should contain two elements: the substring to be replaced and the replacement substring.
 * @returns The modified string with all occurrences of the specified substrings replaced.
 */
export declare function replaceAllPairs(str: string, ...fromTo: [from: string, to: string][]): string;
/**
 * Escapes a string to HTML by replacing special characters with their corresponding HTML entities.
 *
 * @param str - The string to escape.
 * @returns The escaped string.
 * @remarks This function escapes the following characters: `<`, `>`, `&`, `"`, `'`, and `` ` ``. Not all special characters are escaped.
 */
export declare function escapeStringToHTML(str: string): string;
/**
 * Splits a string on a delimiter and removes empty elements.
 *
 * @param source - The string to split.
 * @param delimiter - The delimiter passed to {@link String.split}.
 * @returns The split elements, excluding elements whose length is zero.
 * @remarks Elements are not trimmed or unescaped. An empty delimiter follows
 * JavaScript's behaviour of splitting by UTF-16 code unit.
 */
export declare function splitDelimitedList(source: string, delimiter: string): string[];
/**
 * Joins string elements with a delimiter.
 *
 * @param items - The elements to join. Empty elements are retained.
 * @param delimiter - The separator inserted between elements.
 * @returns The joined string, following {@link Array.join} semantics.
 */
export declare function joinDelimitedList(items: readonly string[], delimiter: string): string;
