[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [BackedQueue](../../README.md) / [BackedQueueTypes](../README.md) / QueryOptions

# Type Alias: QueryOptions

```ts
type QueryOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};
```

Defined in: [src/BackedQueue/BackedQueueTypes.ts:18](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueueTypes.ts#L18)

Options for querying the queue.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="signal"></a> `signal?` | `AbortSignal` | AbortSignal used to cancel the operation. | [src/BackedQueue/BackedQueueTypes.ts:26](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueueTypes.ts#L26) |
| <a id="timeoutms"></a> `timeoutMs?` | `number` | Timeout in milliseconds for the operation. | [src/BackedQueue/BackedQueueTypes.ts:22](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueueTypes.ts#L22) |
