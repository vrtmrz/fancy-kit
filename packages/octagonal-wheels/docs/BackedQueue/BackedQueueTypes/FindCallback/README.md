[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [BackedQueue](../../README.md) / [BackedQueueTypes](../README.md) / FindCallback

# Type Alias: FindCallback\<T\>

```ts
type FindCallback<T> = (item: DequeuedItem<T>) => boolean | Promise<boolean>;
```

Defined in: packages/octagonal-wheels/src/BackedQueue/BackedQueueTypes.ts:113

Callback type for locating items in the queue.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Parameters

| Parameter | Type                                               |
| --------- | -------------------------------------------------- |
| `item`    | [`DequeuedItem`](../DequeuedItem/README.md)\<`T`\> |

## Returns

`boolean` \| `Promise`\<`boolean`\>
