/**
 * Replaces all occurrences of a substring in a string with a new substring.
 * If the `replaceAll` method is available, it uses that method. Otherwise, it splits the string and joins it with the new substring.
 *
 * @param {string} str - The original string.
 * @param {string} search - The substring to be replaced.
 * @param {string} replace - The new substring to replace the occurrences of `search`.
 * @returns {string} The modified string with all occurrences of `search` replaced by `replace`.
 */
export function replaceAll(str: string, search: string, replace: string): string {
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
export function replaceAllPairs(str: string, ...fromTo: [from: string, to: string][]): string {
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
export function escapeStringToHTML(str: string) {
    if (!str) return "";
    return str.replace(/[<>&"'`]/g, (match) => {
        const escape: any = {
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
