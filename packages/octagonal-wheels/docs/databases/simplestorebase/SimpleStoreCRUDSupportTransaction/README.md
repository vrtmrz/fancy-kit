[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [databases](../../README.md) / [simplestorebase](../README.md) / SimpleStoreCRUDSupportTransaction

# Type Alias: SimpleStoreCRUDSupportTransaction\<T\>

```ts
type SimpleStoreCRUDSupportTransaction<T> = SimpleStoreCRUD<T> & {
  beginTransaction: Promise<void>;
};
```

Defined in: [src/databases/SimpleStoreBase.ts:30](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L30)

## Type Declaration

### beginTransaction()

```ts
beginTransaction(callback: (tx: SimpleStoreTransaction<T>) => void | Promise<void>): Promise<void>;
```

Begins a transaction and provides a callback with the transaction object.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `callback` | (`tx`: [`SimpleStoreTransaction`](../SimpleStoreTransaction/README.md)\<`T`\>) => `void` \| `Promise`\<`void`\> | The callback function that receives a transaction object. |

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the transaction is completed.
Note: if you perform asynchronous operations inside the callback, some backends may automatically commit the transaction in some chances of microtasks.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
