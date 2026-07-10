[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [string](../README.md) / replaceAllPairs

# Function: replaceAllPairs()

```ts
function replaceAllPairs(str: string, ...fromTo: [string, string][]): string;
```

Defined in: [src/string.ts:26](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/string.ts#L26)

Replaces all occurrences of multiple pairs of substrings in a string.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `str` | `string` | The input string. |
| ...`fromTo` | \[`string`, `string`\][] | An array of tuples representing the pairs of substrings to be replaced. Each tuple should contain two elements: the substring to be replaced and the replacement substring. |

## Returns

`string`

The modified string with all occurrences of the specified substrings replaced.
