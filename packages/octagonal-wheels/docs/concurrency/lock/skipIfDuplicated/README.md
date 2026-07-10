[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [lock](../README.md) / skipIfDuplicated

# Function: skipIfDuplicated()

```ts
function skipIfDuplicated<T>(key: string | symbol, proc: Task<T>): Promise<null | T>;
```

Defined in: [src/concurrency/lock\_v2.ts:142](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/lock_v2.ts#L142)

Skips the execution of a task if it is already duplicated.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` \| `symbol` | The key to identify the task. |
| `proc` | [`Task`](../Task/README.md)\<`T`\> | The task to be executed. |

## Returns

`Promise`\<`null` \| `T`\>

A promise that resolves to the result of the task, or `null` if the task is duplicated.
