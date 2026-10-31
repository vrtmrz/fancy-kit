[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [task](../README.md) / mapAllTasksWithConcurrencyLimit

# Function: mapAllTasksWithConcurrencyLimit()

```ts
function mapAllTasksWithConcurrencyLimit<T>(
  limit: number,
  tasks: Task<T>[],
): Promise<TaskResultWithKey<T, Error>[]>;
```

Defined in: packages/octagonal-wheels/src/concurrency/task.ts:129

Perform all tasks and returns all result by keeping the order.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Parameters

| Parameter | Type                                 | Description          |
| --------- | ------------------------------------ | -------------------- |
| `limit`   | `number`                             | Concurrency limit    |
| `tasks`   | [`Task`](../Task/README.md)\<`T`\>[] | Tasks to perform all |

## Returns

`Promise`\<[`TaskResultWithKey`](../TaskResultWithKey/README.md)\<`T`, `Error`\>[]\>
