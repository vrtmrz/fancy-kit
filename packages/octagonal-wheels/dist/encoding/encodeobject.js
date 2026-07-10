/**
 * Encoding and decoding of arrays of any type into a compact string representation.
 * This includes support for strings, numbers, booleans, null, undefined, objects, and nested arrays.
 * Functions on this module exported via src/object.ts for easier access.
 */
/**
 * prefix and length map for string and object encoding
 */
const prefixMapObject = {
    s: {
        1: "V",
        2: "W",
        3: "X",
        4: "Y",
        5: "Z",
    },
    o: {
        1: "v",
        2: "w",
        3: "x",
        4: "y",
        5: "z",
    },
};
// decode map for string and object encoding
const decodePrefixMapObject = Object.fromEntries(Object.entries(prefixMapObject).flatMap(([prefix, map]) => Object.entries(map).map(([len, char]) => [char, { prefix, len: parseInt(len) }])));
/**
 * prefix and length map for number encoding
 * n: decimal number
 * N: base36 number
 */
const prefixMapNumber = {
    n: {
        1: "a",
        2: "b",
        3: "c",
        4: "d",
        5: "e",
    },
    N: {
        1: "A",
        2: "B",
        3: "C",
        4: "D",
        5: "E",
    },
};
const decodePrefixMapNumber = Object.fromEntries(Object.entries(prefixMapNumber).flatMap(([prefix, map]) => Object.entries(map).map(([len, char]) => [char, { prefix, len: parseInt(len) }])));
function isValidLength(len) {
    return len >= 1 && len <= 5;
}
const ARRAY_MARKER = "_";
const OBJECT_MARKER = "^";
function encodeObjectAsArray(obj) {
    if (Array.isArray(obj)) {
        return ARRAY_MARKER + encodeAnyArray(obj, true);
    }
    const objArray = [...Object.entries(obj)].flat();
    return OBJECT_MARKER + encodeAnyArray(objArray, true);
}
function decodeObjectFromArray(str) {
    if (str[0] == ARRAY_MARKER) {
        const innerEncoded = str.substring(1);
        const arr = decodeAnyArray(innerEncoded);
        return arr;
    }
    if (str[0] == OBJECT_MARKER) {
        const innerEncoded = str.substring(1);
        const arr = decodeAnyArray(innerEncoded);
        const entries = [];
        for (let i = 0; i < arr.length; i += 2) {
            const key = arr[i];
            const value = arr[i + 1];
            entries.push([key, value]);
        }
        return Object.fromEntries(entries);
    }
    // We already know it's an object if not started with ARRAY_MARKER or OBJECT_MARKER, we can just stringify it
    return JSON.parse(str);
}
/**
 * Encodes an array of any type into a compact string representation.
 * @param obj - The array to encode.
 * @returns The encoded string representation of the array.
 * @remarks
 * The encoding scheme uses specific prefixes to denote the type of each element:
 * - single-character prefixes for constants:
 * - 'n' for null
 * - 'f' for false
 * - 't' for true
 * - 'u' for undefined
 * - multi-character prefixes for strings, objects, and numbers:
 * - [prefix] + [value] : where [prefix] is determined by the type and length of the value:
 * - a-f: numbers in decimal (1-5 for length)
 * - A-E: numbers in base36 (1-5 for length)
 * - V-Z: strings (1-5 for length)
 * - v-z: objects (1-5 for length)
 * The length of the value is encoded in base36 to minimize the size of the resulting string.
 * Hence, the maximum length for strings and objects is 60466175 characters (36^5 - 1). An error is thrown if this limit is exceeded (if occurred).
 * Numbers are unlikely to exceed the length limit due to their nature.
 * If number can be represented in base36 with fewer characters than in decimal, base36 encoding is used.
 * sample encoding:
 * - true -> 't'
 * - 123 -> 'b3f' (decimal, length 3)
 * - 46655 -> 'B3zzz' (base36, length 3)
 * - "hello" -> 'V5hello' (string, length 5)
 * - { "a": 1 } -> 'v5{"a":1}' (object, length 7) (if safer is false and no undefined properties)
 */
function encodeAnyArray(obj, safer = false) {
    const tempArray = obj.map((v) => {
        if (typeof v === "undefined")
            return "u";
        if (v === null)
            return "n";
        if (v === false)
            return "f";
        if (v === true)
            return "t";
        if (typeof v == "number") {
            const isFloat = !Number.isInteger(v);
            const b36 = v.toString(36);
            const strNum = v.toString();
            // Choose base36 if it is shorter or if it is a float (to preserve precision)
            const expression = isFloat || b36.length > strNum.length ? "n" : "N";
            const encodedStr = expression == "N" ? b36 : strNum;
            const len = encodedStr.length.toString(36);
            const lenLen = len.length;
            // Always valid, since numbers cannot be that long
            // but we keep the check for consistency (if some prototype pollution occurs, maybe?)
            /* istanbul ignore if -- @preserve */
            if (!isValidLength(lenLen)) {
                throw new Error("Number length exceeds maximum encodable length of 5 in base36.");
            }
            const prefix2 = prefixMapNumber[expression][lenLen];
            return prefix2 + len + encodedStr;
        }
        let str;
        let prefix;
        if (typeof v === "string") {
            str = v;
            prefix = "s";
        }
        else {
            prefix = "o";
            const objectStr = JSON.stringify(v);
            // While contains undefined, we have to use recursive encoding (JSON.stringify will remove undefined properties).
            const containUndefined = Object.values(v).indexOf(undefined) !== -1;
            if (!safer || containUndefined) {
                const objectEncoded = encodeObjectAsArray(v);
                // Pick the shorter one to reduce size (if not contains undefined).
                const encoded = containUndefined || objectEncoded.length < objectStr.length ? objectEncoded : objectStr;
                str = encoded;
            }
            else {
                str = objectStr;
            }
        }
        const length = str.length.toString(36);
        const lenLen = length.length;
        if (!isValidLength(lenLen)) {
            throw new Error("String/Object length exceeds maximum encodable length of 5 in base36.");
        }
        const prefix2 = prefixMapObject[prefix][lenLen];
        return prefix2 + length + str;
    });
    const w = tempArray.join("");
    return w;
}
const decodeMapConstant = {
    u: undefined,
    n: null,
    f: false,
    t: true,
};
function isDecodeMapConstantKey(key) {
    return key in decodeMapConstant;
}
function isDecodePrefixMapNumberKey(key) {
    return key in decodePrefixMapNumber;
}
function isDecodePrefixMapObjectKey(key) {
    return key in decodePrefixMapObject;
}
function decodeAnyArray(str) {
    const result = [];
    let i = 0;
    while (i < str.length) {
        const char = str[i];
        i++;
        if (isDecodeMapConstantKey(char)) {
            result.push(decodeMapConstant[char]);
            continue;
        }
        if (isDecodePrefixMapNumberKey(char)) {
            const { prefix, len } = decodePrefixMapNumber[char];
            const lenStr = str.substring(i, i + len);
            i += len;
            // const radix = prefix == "N" ? 36 : 10;
            const lenNum = parseInt(lenStr, 36);
            const value = str.substring(i, i + lenNum);
            i += lenNum;
            if (prefix == "N") {
                result.push(parseInt(value, 36));
            }
            else {
                // Very surprisingly, fp numbers on JavaScript is not different from integers when using parseFloat
                result.push(parseFloat(value));
            }
        }
        else if (isDecodePrefixMapObjectKey(char)) {
            const { prefix, len } = decodePrefixMapObject[char];
            const lenStr = str.substring(i, i + len);
            i += len;
            const lenNum = parseInt(lenStr, 36);
            const value = str.substring(i, i + lenNum);
            i += lenNum;
            if (prefix == "s") {
                result.push(value);
            }
            else {
                result.push(decodeObjectFromArray(value));
            }
        }
        else {
            throw new Error(`Invalid encoding at position ${i - 1}: unexpected character '${char}'`);
        }
    }
    return result;
}

export { decodeAnyArray, encodeAnyArray };
//# sourceMappingURL=encodeobject.js.map
