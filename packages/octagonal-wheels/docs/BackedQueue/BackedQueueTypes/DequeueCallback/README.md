[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [BackedQueue](../../README.md) / [BackedQueueTypes](../README.md) / DequeueCallback

# Type Alias: DequeueCallback()\<T\>

```ts
type DequeueCallback<T> = (items: DequeuedItem<T>, context: QueueProcessContext) => Promise<any | void> | any | void;
```

Defined in: [src/BackedQueue/BackedQueueTypes.ts:105](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueueTypes.ts#L105)

Callback type for processing dequeued items.
If context.commit, context.requeue, or context.revoke is not called, the queue commits the item automatically after the callback finishes.
Throwing without using context methods causes automatic revocation of the item.
If a Promise is returned, the queue waits for it to resolve before proceeding.
Warning: if the callback throws, default behaviour depends on implementation.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `items` | [`DequeuedItem`](../DequeuedItem/README.md)\<`T`\> |
| `context` | [`QueueProcessContext`](../QueueProcessContext/README.md) |

## Returns

`Promise`\<`any` \| `void`\> \| `any` \| `void`
