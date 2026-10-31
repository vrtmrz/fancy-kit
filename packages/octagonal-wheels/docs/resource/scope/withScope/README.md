[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [resource](../../README.md) / [scope](../README.md) / withScope

# Function: withScope()

```ts
function withScope<I, O>(value: I, operation: ScopedStep<I, O>): Promise<O>;
```

Defined in: packages/octagonal-wheels/src/resource/scope.ts:134

Runs one operation and awaits all of its registered cleanup before settling.

## Type Parameters

| Type Parameter |
| -------------- |
| `I`            |
| `O`            |

## Parameters

| Parameter   | Type                                                | Description                                                          |
| ----------- | --------------------------------------------------- | -------------------------------------------------------------------- |
| `value`     | `I`                                                 | A borrowed value, passed without cloning or automatic disposal.      |
| `operation` | [`ScopedStep`](../ScopedStep/README.md)\<`I`, `O`\> | Receives a fresh scope and may return a value, promise, or thenable. |

## Returns

`Promise`\<`O`\>

The operation's result after cleanup finishes.

## Throws

The original failure when only the operation or one cleanup fails. Multiple
failures produce an AggregateError, with the operation failure first and cleanup
failures following in execution order. Failure values, including undefined, are preserved.

## Remarks

Cleanup runs in reverse registration order on success, early return, and failure.
Returning an owned resource does not transfer ownership: its registered cleanup still runs.
Callers must await or return the work they start; detached promises are not discovered.
The scope reads no host globals and has no implicit cancellation behaviour.

## Example

```ts
interface Reader {
  read(): Promise<string>;
  close(): Promise<void>;
}
declare function openReader(path: string): Promise<Reader>;

async function readFile(path: string): Promise<string> {
  return await withScope(path, async (ctx) => {
    const reader = await openReader(ctx.value);
    ctx.defer(() => reader.close());
    return await reader.read();
  });
}
```

The returned value is available only after the reader has closed.
