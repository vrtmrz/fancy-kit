[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [string](../README.md) / joinDelimitedList

# Function: joinDelimitedList()

```ts
function joinDelimitedList(items: readonly string[], delimiter: string): string;
```

Defined in: packages/octagonal-wheels/src/string.ts:76

Joins string elements with a delimiter.

## Parameters

| Parameter   | Type                | Description                                        |
| ----------- | ------------------- | -------------------------------------------------- |
| `items`     | readonly `string`[] | The elements to join. Empty elements are retained. |
| `delimiter` | `string`            | The separator inserted between elements.           |

## Returns

`string`

The joined string, following [Array.join](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.join) semantics.
