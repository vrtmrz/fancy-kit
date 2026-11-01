[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [BackedQueue](../../README.md) / [BackedQueueTypes](../README.md) / FindOptions

# Type Alias: FindOptions

```ts
type FindOptions = {
  limit?: number;
  startKey?: QueueKey;
};
```

Defined in: packages/octagonal-wheels/src/BackedQueue/BackedQueueTypes.ts:118

Options for locating items in the queue.

## Properties

| Property                          | Type                                | Description                                                                        | Defined in                                                        |
| --------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| <a id="limit"></a> `limit?`       | `number`                            | Maximum number of items to inspect. If not provided, all items are inspected.      | packages/octagonal-wheels/src/BackedQueue/BackedQueueTypes.ts:127 |
| <a id="startkey"></a> `startKey?` | [`QueueKey`](../QueueKey/README.md) | Start searching from this key. If not provided, searching starts at the beginning. | packages/octagonal-wheels/src/BackedQueue/BackedQueueTypes.ts:122 |
