[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [lock](../README.md) / shareRunningResult

# Function: shareRunningResult()

```ts
function shareRunningResult<T>(key: string | symbol, proc: Task<T>): Promise<T>;
```

Defined in: packages/octagonal-wheels/src/concurrency/lock\_v2.ts:81

If free, run task and return the result (Same as serialized).
If any process has running, share the result.
Mostly same as `SlipBoard.issueAndProceed` but this is for general purpose.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Parameters

| Parameter | Type                               | Description      |
| --------- | ---------------------------------- | ---------------- |
| `key`     | `string` \| `symbol`               | key of the group |
| `proc`    | [`Task`](../Task/README.md)\<`T`\> | process to run   |

## Returns

`Promise`\<`T`\>
