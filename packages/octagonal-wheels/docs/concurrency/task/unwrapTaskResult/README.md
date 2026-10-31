[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [task](../README.md) / unwrapTaskResult

# Function: unwrapTaskResult()

```ts
function unwrapTaskResult<T, U>(result: TaskResult<T, U>): T | U;
```

Defined in: packages/octagonal-wheels/src/concurrency/task.ts:14

## Type Parameters

| Type Parameter        |
| --------------------- |
| `T`                   |
| `U` _extends_ `Error` |

## Parameters

| Parameter | Type                                                |
| --------- | --------------------------------------------------- |
| `result`  | [`TaskResult`](../TaskResult/README.md)\<`T`, `U`\> |

## Returns

`T` \| `U`
