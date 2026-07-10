[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [collection](../README.md) / createTypedArrayReader

# Function: createTypedArrayReader()

```ts
function createTypedArrayReader<T>(buffer: T): TypedArrayReader<T>;
```

Defined in: [src/collection.ts:78](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/collection.ts#L78)

Creates a reader for a given typed array buffer, allowing sequential reading of slices.

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` *extends* `TypedArrays` | The type of the typed array (e.g., Uint8Array, Float32Array). |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `buffer` | `T` | The typed array buffer to read from. |

## Returns

[`TypedArrayReader`](../TypedArrayReader/README.md)\<`T`\>

An object with methods to read a specified number of elements or all remaining elements from the buffer.

## Example

```typescript
const reader = createTypedArrayReader(new Uint8Array([1, 2, 3, 4]));
const firstTwo = reader.read(2); // Uint8Array [1, 2]
const rest = reader.readAll();   // Uint8Array [3, 4]
```
