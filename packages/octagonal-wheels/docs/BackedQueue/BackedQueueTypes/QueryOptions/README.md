[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [BackedQueue](../../README.md) / [BackedQueueTypes](../README.md) / QueryOptions

# Type Alias: QueryOptions

```ts
type QueryOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};
```

Defined in: packages/octagonal-wheels/src/BackedQueue/BackedQueueTypes.ts:18

Options for querying the queue.

## Properties

| Property                            | Type          | Description                                | Defined in                                                       |
| ----------------------------------- | ------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| <a id="signal"></a> `signal?`       | `AbortSignal` | AbortSignal used to cancel the operation.  | packages/octagonal-wheels/src/BackedQueue/BackedQueueTypes.ts:26 |
| <a id="timeoutms"></a> `timeoutMs?` | `number`      | Timeout in milliseconds for the operation. | packages/octagonal-wheels/src/BackedQueue/BackedQueueTypes.ts:22 |
