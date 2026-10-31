[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [binary](../README.md) / TypedArrayReader

# Type Alias: TypedArrayReader\<T\>

```ts
type TypedArrayReader<T> = {
  read: (length: number) => T;
  readAll: () => T;
};
```

Defined in: packages/octagonal-wheels/src/binary/typedArray.ts:11

Represents a reader interface for typed arrays, providing methods to read a specified number of elements or all elements.

## Param

**length**

The number of elements to read.

## Type Parameters

| Type Parameter | Description                                      |
| -------------- | ------------------------------------------------ |
| `T`            | The type of the elements returned by the reader. |

## Properties

| Property                       | Type                        | Description                                          | Defined in                                            |
| ------------------------------ | --------------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| <a id="read"></a> `read`       | (`length`: `number`) => `T` | Reads a specified number of elements from the array. | packages/octagonal-wheels/src/binary/typedArray.ts:12 |
| <a id="readall"></a> `readAll` | () => `T`                   | Reads all elements from the array.                   | packages/octagonal-wheels/src/binary/typedArray.ts:13 |
