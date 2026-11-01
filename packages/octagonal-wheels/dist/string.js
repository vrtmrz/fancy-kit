/**
 * Replaces all occurrences of a substring in a string with a new substring.
 * If the `replaceAll` method is available, it uses that method. Otherwise, it splits the string and joins it with the new substring.
 *
 * @param {string} str - The original string.
 * @param {string} search - The substring to be replaced.
 * @param {string} replace - The new substring to replace the occurrences of `search`.
 * @returns {string} The modified string with all occurrences of `search` replaced by `replace`.
 */
function replaceAll(str, search, replace) {
    if ("replaceAll" in String.prototype) {
        //@ts-ignore
        return str.replaceAll(search, replace);
    }
    return str.split(search).join(replace);
}
/**
 * Replaces all occurrences of multiple pairs of substrings in a string.
 *
 * @param str - The input string.
 * @param fromTo - An array of tuples representing the pairs of substrings to be replaced.
 * Each tuple should contain two elements: the substring to be replaced and the replacement substring.
 * @returns The modified string with all occurrences of the specified substrings replaced.
 */
function replaceAllPairs(str, ...fromTo) {
    let r = `${str}`;
    for (const [from, to] of fromTo) {
        r = replaceAll(r, from, to);
    }
    return r;
}
/**
 * Escapes a string to HTML by replacing special characters with their corresponding HTML entities.
 *
 * @param str - The string to escape.
 * @returns The escaped string.
 * @remarks This function escapes the following characters: `<`, `>`, `&`, `"`, `'`, and `` ` ``. Not all special characters are escaped.
 */
function escapeStringToHTML(str) {
    if (!str)
        return "";
    return str.replace(/[<>&"'`]/g, (match) => {
        const escape = {
            "<": "&lt;",
            ">": "&gt;",
            "&": "&amp;",
            '"': "&quot;",
            "'": "&#39;",
            "`": "&#x60;",
        };
        return escape[match];
    });
}
/**
 * Splits a string on a delimiter and removes empty elements.
 *
 * @param source - The string to split.
 * @param delimiter - The delimiter passed to {@link String.split}.
 * @returns The split elements, excluding elements whose length is zero.
 * @remarks Elements are not trimmed or unescaped. An empty delimiter follows
 * JavaScript's behaviour of splitting by UTF-16 code unit.
 */
function splitDelimitedList(source, delimiter) {
    return source.split(delimiter).filter((item) => item.length > 0);
}
/**
 * Joins string elements with a delimiter.
 *
 * @param items - The elements to join. Empty elements are retained.
 * @param delimiter - The separator inserted between elements.
 * @returns The joined string, following {@link Array.join} semantics.
 */
function joinDelimitedList(items, delimiter) {
    return items.join(delimiter);
}

export { escapeStringToHTML, joinDelimitedList, replaceAll, replaceAllPairs, splitDelimitedList };
//# sourceMappingURL=string.js.map
