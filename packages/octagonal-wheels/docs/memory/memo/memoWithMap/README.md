[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [memory](../../README.md) / [memo](../README.md) / memoWithMap

# Function: memoWithMap()

```ts
function memoWithMap<T, TResult>(
  bufferLength: number,
  fn: (...args: T) => Promise<TResult>,
  keyFunction?: (args: T) => string,
): (...args: T) => Promise<TResult>;
```

Defined in: packages/octagonal-wheels/src/memory/memo.ts:5

## Type Parameters

| Type Parameter        |
| --------------------- |
| `T` _extends_ `any`[] |
| `TResult`             |

## Parameters

| Parameter      | Type                                       |
| -------------- | ------------------------------------------ |
| `bufferLength` | `number`                                   |
| `fn`           | (...`args`: `T`) => `Promise`\<`TResult`\> |
| `keyFunction?` | (`args`: `T`) => `string`                  |

## Returns

(...`args`: `T`) => `Promise`\<`TResult`\>
