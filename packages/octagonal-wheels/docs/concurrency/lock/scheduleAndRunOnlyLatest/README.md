[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [lock](../README.md) / scheduleAndRunOnlyLatest

# Function: scheduleAndRunOnlyLatest()

```ts
function scheduleAndRunOnlyLatest<T>(
   group: string, 
   key: string, 
proc: (ac?: AbortController) => Promise<T>): Promise<typeof SCHEDULE_SKIPPED | T>;
```

Defined in: [src/concurrency/lock\_v2.ts:314](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/lock_v2.ts#L314)

Schedule a task to run with concurrency control, ensuring that only the latest task is run.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `group` | `string` | The group to which the task belongs. |
| `key` | `string` | The unique key for the task. |
| `proc` | (`ac?`: `AbortController`) => `Promise`\<`T`\> | The function to run the task. |

## Returns

`Promise`\<*typeof* [`SCHEDULE_SKIPPED`](../SCHEDULE_SKIPPED/README.md) \| `T`\>

A promise that resolves with the result of the task or a symbol indicating the task was skipped.
