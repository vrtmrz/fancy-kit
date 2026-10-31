[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [lock](../README.md) / withLock

# Function: withLock()

```ts
function withLock<T>(key: string | symbol, proc: Task<T>): Promise<T>;
```

Defined in: packages/octagonal-wheels/src/concurrency/lock.scoped.ts:21

Runs an operation while holding its keyed lock and releases it afterwards.

Operations using the same key run in invocation order. The legacy serialized
entry shares these locks. Synchronous values and asynchronous results are
preserved, and a failed operation does not prevent queued operations running.
Reacquiring a key held by the same operation can deadlock.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Parameters

| Parameter | Type                               | Description                                                      |
| --------- | ---------------------------------- | ---------------------------------------------------------------- |
| `key`     | `string` \| `symbol`               | Shared lock group, identified by a string or symbol.             |
| `proc`    | [`Task`](../Task/README.md)\<`T`\> | Operation to start after earlier operations for this key finish. |

## Returns

`Promise`\<`T`\>

The operation's result after its lock bookkeeping completes.
