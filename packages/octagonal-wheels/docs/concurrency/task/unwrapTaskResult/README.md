[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [task](../README.md) / unwrapTaskResult

# Function: unwrapTaskResult()

```ts
function unwrapTaskResult<T, U>(result: TaskResult<T, U>): T | U;
```

Defined in: [src/concurrency/task.ts:14](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/task.ts#L14)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
| `U` *extends* `Error` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `result` | [`TaskResult`](../TaskResult/README.md)\<`T`, `U`\> |

## Returns

`T` \| `U`
