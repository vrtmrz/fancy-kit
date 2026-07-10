[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [object](../README.md) / encodeAnyArray

# Function: encodeAnyArray()

```ts
function encodeAnyArray(obj: any[], safer: boolean): string;
```

Defined in: [src/encoding/encodeobject.ts:132](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encoding/encodeobject.ts#L132)

Encodes an array of any type into a compact string representation.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `obj` | `any`[] | `undefined` | The array to encode. |
| `safer` | `boolean` | `false` | - |

## Returns

`string`

The encoded string representation of the array.

## Remarks

The encoding scheme uses specific prefixes to denote the type of each element:
- single-character prefixes for constants:
- 'n' for null
- 'f' for false
- 't' for true
- 'u' for undefined
- multi-character prefixes for strings, objects, and numbers:
- [prefix] + [value] : where [prefix] is determined by the type and length of the value:
- a-f: numbers in decimal (1-5 for length)
- A-E: numbers in base36 (1-5 for length)
- V-Z: strings (1-5 for length)
- v-z: objects (1-5 for length)
The length of the value is encoded in base36 to minimize the size of the resulting string.
Hence, the maximum length for strings and objects is 60466175 characters (36^5 - 1). An error is thrown if this limit is exceeded (if occurred).
Numbers are unlikely to exceed the length limit due to their nature.
If number can be represented in base36 with fewer characters than in decimal, base36 encoding is used.
sample encoding:
- true -> 't'
- 123 -> 'b3f' (decimal, length 3)
- 46655 -> 'B3zzz' (base36, length 3)
- "hello" -> 'V5hello' (string, length 5)
- { "a": 1 } -> 'v5{"a":1}' (object, length 7) (if safer is false and no undefined properties)
