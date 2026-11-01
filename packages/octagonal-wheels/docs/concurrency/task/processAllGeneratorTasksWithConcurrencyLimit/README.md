[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [task](../README.md) / processAllGeneratorTasksWithConcurrencyLimit

# Function: processAllGeneratorTasksWithConcurrencyLimit()

```ts
function processAllGeneratorTasksWithConcurrencyLimit<T>(
  limit: number,
  tasks: AsyncGenerator<Task<T>, undefined, unknown>,
): AsyncGenerator<TaskResultWithKey<T, Error>, void, unknown>;
```

Defined in: packages/octagonal-wheels/src/concurrency/task.ts:44

Perform all tasks within given concurrency.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Parameters

| Parameter | Type                                                                           | Description          |
| --------- | ------------------------------------------------------------------------------ | -------------------- |
| `limit`   | `number`                                                                       | Concurrency limit    |
| `tasks`   | `AsyncGenerator`\<[`Task`](../Task/README.md)\<`T`\>, `undefined`, `unknown`\> | Tasks to perform all |

## Returns

`AsyncGenerator`\<[`TaskResultWithKey`](../TaskResultWithKey/README.md)\<`T`, `Error`\>, `void`, `unknown`\>
