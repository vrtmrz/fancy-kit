[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [counting](../README.md) / withCounting

# Function: withCounting()

```ts
function withCounting<T>(
  counter: MutableCount,
  operation: () => T | PromiseLike<T>,
): Promise<T>;
```

Defined in: packages/octagonal-wheels/src/concurrency/counting.ts:16

Counts an operation until its result or thenable settles.

Incrementing succeeds before the operation starts. The operation's result or
failure is preserved, and the count is decremented in finally. Accessor
failures propagate; a decrement failure takes precedence over an operation
failure, following ordinary finally semantics. The caller chooses whether
the scope includes waiting, processing, or both.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Parameters

| Parameter   | Type                                        |
| ----------- | ------------------------------------------- |
| `counter`   | [`MutableCount`](../MutableCount/README.md) |
| `operation` | () => `T` \| `PromiseLike`\<`T`\>           |

## Returns

`Promise`\<`T`\>
