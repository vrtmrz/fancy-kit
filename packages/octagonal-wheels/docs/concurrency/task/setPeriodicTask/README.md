[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [task](../README.md) / setPeriodicTask

# Function: setPeriodicTask()

```ts
function setPeriodicTask(
  key: string,
  timeout: number,
  proc: () => void | Promise<any>,
): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/task.ts:167

## Parameters

| Parameter | Type                               |
| --------- | ---------------------------------- |
| `key`     | `string`                           |
| `timeout` | `number`                           |
| `proc`    | () => `void` \| `Promise`\<`any`\> |

## Returns

`void`
