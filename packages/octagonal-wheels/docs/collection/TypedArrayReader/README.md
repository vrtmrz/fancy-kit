[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [collection](../README.md) / TypedArrayReader

# Type Alias: TypedArrayReader\<T\>

```ts
type TypedArrayReader<T> = {
  read: (length: number) => T;
  readAll: () => T;
};
```

Defined in: [src/collection.ts:49](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/collection.ts#L49)

Represents a reader interface for typed arrays, providing methods to read a specified number of elements or all elements.

## Param

The number of elements to read.

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of the elements returned by the reader. |

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="read"></a> `read` | (`length`: `number`) => `T` | Reads a specified number of elements from the array. | [src/collection.ts:50](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/collection.ts#L50) |
| <a id="readall"></a> `readAll` | () => `T` | Reads all elements from the array. | [src/collection.ts:51](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/collection.ts#L51) |
