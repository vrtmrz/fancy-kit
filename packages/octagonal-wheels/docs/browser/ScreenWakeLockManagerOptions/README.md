[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [browser](../README.md) / ScreenWakeLockManagerOptions

# Interface: ScreenWakeLockManagerOptions

Defined in: packages/octagonal-wheels/src/browser/wakeLock.ts:110

Dependencies and diagnostics for a screen wake-lock manager.

## Properties

| Property                          | Type                                                                           | Description                                                                                                                                                                            | Defined in                                            |
| --------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| <a id="document"></a> `document?` | [`ScreenWakeLockDocument`](../ScreenWakeLockDocument/README.md) \| `null`      | The document visibility source. When omitted, `document` is resolved when the manager is created. Pass `null` when no visibility lifecycle is available.                               | packages/octagonal-wheels/src/browser/wakeLock.ts:123 |
| <a id="onevent"></a> `onEvent?`   | (`event`: [`ScreenWakeLockEvent`](../ScreenWakeLockEvent/README.md)) => `void` | Receives lifecycle events. Exceptions thrown by this observer are ignored so diagnostics cannot alter the protected task.                                                              | packages/octagonal-wheels/src/browser/wakeLock.ts:129 |
| <a id="provider"></a> `provider?` | [`ScreenWakeLockProvider`](../ScreenWakeLockProvider/README.md) \| `null`      | The platform wake-lock provider. When omitted, the provider is resolved from `navigator.wakeLock` when the manager is created. Pass `null` to disable platform acquisition explicitly. | packages/octagonal-wheels/src/browser/wakeLock.ts:116 |
