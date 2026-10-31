[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [task](../README.md) / pipeArrayToGenerator

# Function: pipeArrayToGenerator()

```ts
function pipeArrayToGenerator<T, U>(
  array: T[],
  callback: (obj: T) => Promise<U>,
): Generator<TaskWaiting<U>>;
```

Defined in: packages/octagonal-wheels/src/concurrency/task.ts:85

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |
| `U`            |

## Parameters

| Parameter  | Type                             |
| ---------- | -------------------------------- |
| `array`    | `T`[]                            |
| `callback` | (`obj`: `T`) => `Promise`\<`U`\> |

## Returns

`Generator`\<[`TaskWaiting`](../TaskWaiting/README.md)\<`U`\>\>
