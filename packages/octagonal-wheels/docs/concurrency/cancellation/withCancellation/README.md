[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [cancellation](../README.md) / withCancellation

# Function: withCancellation()

```ts
function withCancellation<I, O>(
  value: I,
  options: CancellationOptions,
  operation: ScopedStep<I, O, Cancellation>,
): Promise<O>;
```

Defined in: packages/octagonal-wheels/src/concurrency/cancellation.ts:49

Runs an operation in a scope with its own cancellation signal.

A fresh controller is created for each invocation. If a parent signal is
supplied, its abort is forwarded with the same reason. The operation is
invoked even when the parent is already aborted, allowing it to return a
partial or application-specific cancellation result.

Cancellation does not reject this promise, skip the operation, replace its
result, or discard its errors. The wrapper waits for the operation and all
deferred cleanup to settle. User cleanup runs before the parent listener is
removed and the owned signal is aborted. A parent abort during cleanup is
still forwarded promptly.

## Type Parameters

| Type Parameter | Description                                |
| -------------- | ------------------------------------------ |
| `I`            | The input value shared with the operation. |
| `O`            | The operation result.                      |

## Parameters

| Parameter   | Type                                                                                                                  | Description                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `value`     | `I`                                                                                                                   | The value exposed as the scope value.                      |
| `options`   | [`CancellationOptions`](../CancellationOptions/README.md)                                                             | Optional parent cancellation signal.                       |
| `operation` | [`ScopedStep`](../../../resource/scope/ScopedStep/README.md)\<`I`, `O`, [`Cancellation`](../Cancellation/README.md)\> | Work which receives the scope and cancellation capability. |

## Returns

`Promise`\<`O`\>

The operation result after deferred cleanup has settled.
