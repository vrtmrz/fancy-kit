[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [browser](../README.md) / ScreenWakeLockLease

# Interface: ScreenWakeLockLease

Defined in: packages/octagonal-wheels/src/browser/wakeLock.ts:133

A logical request to keep the screen awake.

## Properties

| Property                         | Modifier   | Type                    | Description                                                         | Defined in                                            |
| -------------------------------- | ---------- | ----------------------- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| <a id="label"></a> `label`       | `readonly` | `string` \| `undefined` | The optional diagnostic label supplied when the lease was acquired. | packages/octagonal-wheels/src/browser/wakeLock.ts:138 |
| <a id="released"></a> `released` | `readonly` | `boolean`               | Whether this lease has been disposed or cancelled.                  | packages/octagonal-wheels/src/browser/wakeLock.ts:135 |

## Methods

### dispose()

```ts
dispose(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/browser/wakeLock.ts:144

Releases this logical lease. The operation is idempotent. The shared
platform wake lock is released after the final logical lease ends.

#### Returns

`Promise`\<`void`\>
