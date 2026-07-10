[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [lock](../README.md) / scheduleOnceIfDuplicated

# Function: scheduleOnceIfDuplicated()

```ts
function scheduleOnceIfDuplicated<T>(key: string, proc: () => Promise<T>): Promise<undefined | null | T>;
```

Defined in: [src/concurrency/lock\_v2.ts:170](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/lock_v2.ts#L170)

Schedules a process to be executed once if it is not already running.
If the process is already running, it will be added to the waiting queue. An existing waiting process will be replaced.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key used to identify the process. |
| `proc` | () => `Promise`\<`T`\> | The process to be executed. |

## Returns

`Promise`\<`undefined` \| `null` \| `T`\>

A Promise that resolves once the process has been scheduled.
