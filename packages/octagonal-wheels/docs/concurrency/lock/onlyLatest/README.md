[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [lock](../README.md) / onlyLatest

# Function: onlyLatest()

```ts
function onlyLatest<T>(
  key: string | symbol,
  proc: Task<T>,
): Promise<typeof SYMBOL_SKIPPED | T>;
```

Defined in: packages/octagonal-wheels/src/concurrency/lock\_v2.ts:35

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Parameters

| Parameter | Type                               |
| --------- | ---------------------------------- |
| `key`     | `string` \| `symbol`               |
| `proc`    | [`Task`](../Task/README.md)\<`T`\> |

## Returns

`Promise`\<_typeof_ [`SYMBOL_SKIPPED`](../SYMBOL_SKIPPED/README.md) \| `T`\>
