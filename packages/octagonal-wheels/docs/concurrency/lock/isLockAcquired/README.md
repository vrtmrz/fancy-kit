[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [lock](../README.md) / isLockAcquired

# Function: isLockAcquired()

```ts
function isLockAcquired(key: string | symbol): boolean;
```

Defined in: packages/octagonal-wheels/src/concurrency/lock.scoped.ts:75

Reports whether an operation is running or queued for a shared lock key.

## Parameters

| Parameter | Type                 | Description                                                      |
| --------- | -------------------- | ---------------------------------------------------------------- |
| `key`     | `string` \| `symbol` | Lock group shared by withLock, withLocks, and legacy serialized. |

## Returns

`boolean`

Whether the key currently has a running or queued operation.
