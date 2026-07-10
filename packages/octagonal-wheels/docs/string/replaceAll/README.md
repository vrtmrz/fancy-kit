[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [string](../README.md) / replaceAll

# Function: replaceAll()

```ts
function replaceAll(
   str: string, 
   search: string, 
   replace: string): string;
```

Defined in: [src/string.ts:10](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/string.ts#L10)

Replaces all occurrences of a substring in a string with a new substring.
If the `replaceAll` method is available, it uses that method. Otherwise, it splits the string and joins it with the new substring.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `str` | `string` | The original string. |
| `search` | `string` | The substring to be replaced. |
| `replace` | `string` | The new substring to replace the occurrences of `search`. |

## Returns

`string`

The modified string with all occurrences of `search` replaced by `replace`.
