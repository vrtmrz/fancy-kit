[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [lock](../README.md) / withLocks

# Function: withLocks()

```ts
function withLocks<T>(keys: readonly string[], proc: Task<T>): Promise<T>;
```

Defined in: packages/octagonal-wheels/src/concurrency/lock.scoped.ts:63

Holds each supplied key in order while an operation runs.

Keys must be unique and use a consistent order across overlapping operations.
No sorting or deduplication is performed. Duplicate keys, inconsistent orders,
or reacquiring a held key can deadlock. The input array is not modified.
An empty array invokes the operation immediately. All acquired locks are
released after success or failure, preserving the result or original failure.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Parameters

| Parameter | Type                               | Description                                           |
| --------- | ---------------------------------- | ----------------------------------------------------- |
| `keys`    | readonly `string`[]                | Unique keys in the caller's shared acquisition order. |
| `proc`    | [`Task`](../Task/README.md)\<`T`\> | Operation to run after every key has been acquired.   |

## Returns

`Promise`\<`T`\>

The operation's result after releasing the acquired locks.
