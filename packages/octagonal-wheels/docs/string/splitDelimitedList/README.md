[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [string](../README.md) / splitDelimitedList

# Function: splitDelimitedList()

```ts
function splitDelimitedList(source: string, delimiter: string): string[];
```

Defined in: packages/octagonal-wheels/src/string.ts:65

Splits a string on a delimiter and removes empty elements.

## Parameters

| Parameter   | Type     | Description                                                                                                                |
| ----------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `source`    | `string` | The string to split.                                                                                                       |
| `delimiter` | `string` | The delimiter passed to [String.split](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.split). |

## Returns

`string`[]

The split elements, excluding elements whose length is zero.

## Remarks

Elements are not trimmed or unescaped. An empty delimiter follows
JavaScript's behaviour of splitting by UTF-16 code unit.
