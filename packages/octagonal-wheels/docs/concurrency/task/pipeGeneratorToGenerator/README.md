[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [task](../README.md) / pipeGeneratorToGenerator

# Function: pipeGeneratorToGenerator()

```ts
function pipeGeneratorToGenerator<T, U>(
  generator: AsyncGenerator<T>,
  callback: (obj: T) => Promise<U>,
): AsyncGenerator<TaskWaiting<U>>;
```

Defined in: packages/octagonal-wheels/src/concurrency/task.ts:76

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |
| `U`            |

## Parameters

| Parameter   | Type                             |
| ----------- | -------------------------------- |
| `generator` | `AsyncGenerator`\<`T`\>          |
| `callback`  | (`obj`: `T`) => `Promise`\<`U`\> |

## Returns

`AsyncGenerator`\<[`TaskWaiting`](../TaskWaiting/README.md)\<`U`\>\>
