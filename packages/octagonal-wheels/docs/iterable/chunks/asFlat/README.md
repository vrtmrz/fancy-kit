[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [iterable](../../README.md) / [chunks](../README.md) / asFlat

# Function: asFlat()

```ts
function asFlat<T>(source: AsyncIterable<AsyncIterable<T, any, any> | Iterable<T, any, any>>): AsyncIterable<T>;
```

Defined in: [src/iterable/chunks.ts:97](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/iterable/chunks.ts#L97)

Flattens nested async or sync iterables.
The counterpart to `asChunk`.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `source` | `AsyncIterable`\<`AsyncIterable`\<`T`, `any`, `any`\> \| `Iterable`\<`T`, `any`, `any`\>\> |  |

## Returns

`AsyncIterable`\<`T`\>
