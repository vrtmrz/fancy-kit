[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [cancellation](../README.md) / CancellationOptions

# Interface: CancellationOptions

Defined in: packages/octagonal-wheels/src/concurrency/cancellation.ts:20

Options controlling how a cancellation scope is linked to its caller.

## Properties

| Property                      | Modifier   | Type          | Description                                                                                                                                    | Defined in                                                   |
| ----------------------------- | ---------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| <a id="signal"></a> `signal?` | `readonly` | `AbortSignal` | Optional parent signal. Its abort reason is forwarded to the owned signal. The parent signal is observed but is never aborted by this wrapper. | packages/octagonal-wheels/src/concurrency/cancellation.ts:25 |
