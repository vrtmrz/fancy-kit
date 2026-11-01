[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [lock](../README.md) / serialized

# ~~Function: serialized()~~

```ts
function serialized<T>(key: string | symbol, proc: Task<T>): Promise<T>;
```

Defined in: packages/octagonal-wheels/src/concurrency/lock\_v2.ts:28

Runs tasks one at a time in their keyed group.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Parameters

| Parameter | Type                               | Description                                  |
| --------- | ---------------------------------- | -------------------------------------------- |
| `key`     | `string` \| `symbol`               | Shared lock group.                           |
| `proc`    | [`Task`](../Task/README.md)\<`T`\> | Operation to execute while holding the lock. |

## Returns

`Promise`\<`T`\>

The operation result, using the same locks as withLock and withLocks.

## Deprecated

Use withLock for new code.
