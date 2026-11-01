[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [iterable](../../README.md) / [asyncQueue](../README.md) / createAsyncQueue

# Function: createAsyncQueue()

```ts
function createAsyncQueue<T>(): AsyncQueue<T>;
```

Defined in: packages/octagonal-wheels/src/iterable/asyncQueue.ts:54

Creates an in-memory FIFO queue for one consumer.

Values are retained by identity, including undefined and promise-valued
values. The iterator returns each value as-is; consumers decide whether to
await a promise stored as a value. Enqueue has no fixed capacity. The queue
has no retries, cancellation signal, persistence, or callback concurrency;
owners can register dispose() with their scope and connect cancellation to
disposal.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Returns

[`AsyncQueue`](../AsyncQueue/README.md)\<`T`\>

A queue with a single async iterator and explicit disposal.
