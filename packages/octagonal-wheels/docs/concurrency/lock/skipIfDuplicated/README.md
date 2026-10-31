[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [lock](../README.md) / skipIfDuplicated

# Function: skipIfDuplicated()

```ts
function skipIfDuplicated<T>(
  key: string | symbol,
  proc: Task<T>,
): Promise<T | null>;
```

Defined in: packages/octagonal-wheels/src/concurrency/lock\_v2.ts:108

Skips the execution of a task if it is already duplicated.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Parameters

| Parameter | Type                               | Description                   |
| --------- | ---------------------------------- | ----------------------------- |
| `key`     | `string` \| `symbol`               | The key to identify the task. |
| `proc`    | [`Task`](../Task/README.md)\<`T`\> | The task to be executed.      |

## Returns

`Promise`\<`T` \| `null`\>

A promise that resolves to the result of the task, or `null` if the task is duplicated.
