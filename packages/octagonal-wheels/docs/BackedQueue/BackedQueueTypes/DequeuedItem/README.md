[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [BackedQueue](../../README.md) / [BackedQueueTypes](../README.md) / DequeuedItem

# Type Alias: DequeuedItem\<T\>

```ts
type DequeuedItem<T> = {
  item: T;
  key: QueueKeyOnProcess;
};
```

Defined in: packages/octagonal-wheels/src/BackedQueue/BackedQueueTypes.ts:79

An item dequeued from the queue with its key.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Properties

| Property                 | Type                                                  | Description                      | Defined in                                                       |
| ------------------------ | ----------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| <a id="item"></a> `item` | `T`                                                   | The item being processed.        | packages/octagonal-wheels/src/BackedQueue/BackedQueueTypes.ts:87 |
| <a id="key"></a> `key`   | [`QueueKeyOnProcess`](../QueueKeyOnProcess/README.md) | Key of the item being processed. | packages/octagonal-wheels/src/BackedQueue/BackedQueueTypes.ts:83 |
