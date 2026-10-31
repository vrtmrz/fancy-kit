[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [browser](../README.md) / ScreenWakeLockAcquireOptions

# Interface: ScreenWakeLockAcquireOptions

Defined in: packages/octagonal-wheels/src/browser/wakeLock.ts:98

Options which apply to one logical wake-lock scope.

## Properties

| Property                      | Type          | Description                                                                                                  | Defined in                                            |
| ----------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| <a id="label"></a> `label?`   | `string`      | An optional label included in diagnostic lifecycle events.                                                   | packages/octagonal-wheels/src/browser/wakeLock.ts:106 |
| <a id="signal"></a> `signal?` | `AbortSignal` | Releases the logical lease when aborted. An already-aborted signal creates an inert, already-released lease. | packages/octagonal-wheels/src/browser/wakeLock.ts:103 |
