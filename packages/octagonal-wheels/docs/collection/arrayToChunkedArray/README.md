[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [collection](../README.md) / arrayToChunkedArray

# Function: arrayToChunkedArray()

```ts
function arrayToChunkedArray<T>(arr: T[], chunkLength: number): Generator<T[], void, unknown>;
```

Defined in: [src/collection.ts:7](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/collection.ts#L7)

Converts an array into a chunked array.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arr` | `T`[] | The input array. |
| `chunkLength` | `number` | The length of each chunk. |

## Returns

`Generator`\<`T`[], `void`, `unknown`\>

A generator that yields chunked arrays.
