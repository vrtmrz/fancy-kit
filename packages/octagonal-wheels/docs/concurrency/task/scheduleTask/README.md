[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [task](../README.md) / scheduleTask

# Function: scheduleTask()

```ts
function scheduleTask(
  key: string,
  timeout: number,
  proc: () => void | Promise<any>,
  skipIfTaskExist?: boolean,
): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/task.ts:143

## Parameters

| Parameter          | Type                               |
| ------------------ | ---------------------------------- |
| `key`              | `string`                           |
| `timeout`          | `number`                           |
| `proc`             | () => `void` \| `Promise`\<`any`\> |
| `skipIfTaskExist?` | `boolean`                          |

## Returns

`void`
