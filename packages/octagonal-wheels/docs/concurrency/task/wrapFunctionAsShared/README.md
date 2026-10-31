[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [task](../README.md) / wrapFunctionAsShared

# Function: wrapFunctionAsShared()

```ts
function wrapFunctionAsShared<P, T>(
  proc: (...p: P) => Promise<T>,
): (...p: P) => Promise<T>;
```

Defined in: packages/octagonal-wheels/src/concurrency/task.ts:222

## Type Parameters

| Type Parameter        |
| --------------------- |
| `P` _extends_ `any`[] |
| `T`                   |

## Parameters

| Parameter | Type                              |
| --------- | --------------------------------- |
| `proc`    | (...`p`: `P`) => `Promise`\<`T`\> |

## Returns

(...`p`: `P`) => `Promise`\<`T`\>
