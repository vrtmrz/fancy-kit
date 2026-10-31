[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [iterable](../../README.md) / [chunks](../README.md) / asChunk

# Function: asChunk()

```ts
function asChunk<T>(
  source: Iterable<T, any, any> | AsyncIterable<T, any, any>,
  options: ChunkProcessOptions,
): AsyncIterable<T[]>;
```

Defined in: packages/octagonal-wheels/src/iterable/chunks.ts:32

async generator that yields chunks of items from the source.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Parameters

| Parameter | Type                                                                    | Description |
| --------- | ----------------------------------------------------------------------- | ----------- |
| `source`  | `Iterable`\<`T`, `any`, `any`\> \| `AsyncIterable`\<`T`, `any`, `any`\> | -           |
| `options` | `ChunkProcessOptions`                                                   | -           |

## Returns

`AsyncIterable`\<`T`[]\>
