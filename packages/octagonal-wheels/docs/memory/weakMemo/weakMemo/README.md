[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [memory](../../README.md) / [weakMemo](../README.md) / weakMemo

# Function: weakMemo()

```ts
function weakMemo<T, TResult>(
  fn: (...args: T) => Promise<TResult>,
  keyFunction?: (args: T) => string,
): (...args: T) => Promise<TResult>;
```

Defined in: packages/octagonal-wheels/src/memory/weakMemo.ts:15

Creates a weakly memoized version of an asynchronous function.

## Type Parameters

| Type Parameter        |
| --------------------- |
| `T` _extends_ `any`[] |
| `TResult`             |

## Parameters

| Parameter      | Type                                       | Description                                                               |
| -------------- | ------------------------------------------ | ------------------------------------------------------------------------- |
| `fn`           | (...`args`: `T`) => `Promise`\<`TResult`\> | The asynchronous function to memoize.                                     |
| `keyFunction?` | (`args`: `T`) => `string`                  | An optional function to generate a cache key from the function arguments. |

## Returns

A new function that memoizes the results of the original function.

(...`args`: `T`) => `Promise`\<`TResult`\>
