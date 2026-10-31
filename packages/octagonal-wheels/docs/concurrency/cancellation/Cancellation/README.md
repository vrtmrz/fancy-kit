[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [cancellation](../README.md) / Cancellation

# Interface: Cancellation

Defined in: packages/octagonal-wheels/src/concurrency/cancellation.ts:9

Cancellation capabilities supplied by a cancellation-aware operation.

Child scopes borrow these capabilities. Closing a child scope does not abort
the signal; the withCancellation invocation which created it owns that signal.

## Properties

| Property                     | Modifier   | Type          | Description                                                      | Defined in                                                   |
| ---------------------------- | ---------- | ------------- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| <a id="signal"></a> `signal` | `readonly` | `AbortSignal` | The signal owned by the surrounding withCancellation invocation. | packages/octagonal-wheels/src/concurrency/cancellation.ts:11 |

## Methods

### isCancelled()

```ts
isCancelled(): boolean;
```

Defined in: packages/octagonal-wheels/src/concurrency/cancellation.ts:13

Reports whether the owned signal has been aborted.

#### Returns

`boolean`
