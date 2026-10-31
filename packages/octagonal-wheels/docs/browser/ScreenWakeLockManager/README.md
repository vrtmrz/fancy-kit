[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [browser](../README.md) / ScreenWakeLockManager

# Interface: ScreenWakeLockManager

Defined in: packages/octagonal-wheels/src/browser/wakeLock.ts:148

A reference-counted, best-effort screen wake-lock capability.

## Properties

| Property                                         | Modifier   | Type      | Description                                                             | Defined in                                            |
| ------------------------------------------------ | ---------- | --------- | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| <a id="activeleasecount"></a> `activeLeaseCount` | `readonly` | `number`  | The number of active logical leases.                                    | packages/octagonal-wheels/src/browser/wakeLock.ts:156 |
| <a id="held"></a> `held`                         | `readonly` | `boolean` | Whether the manager currently holds a platform wake-lock sentinel.      | packages/octagonal-wheels/src/browser/wakeLock.ts:153 |
| <a id="supported"></a> `supported`               | `readonly` | `boolean` | Whether a platform screen wake-lock provider was available at creation. | packages/octagonal-wheels/src/browser/wakeLock.ts:150 |

## Methods

### acquire()

```ts
acquire(options?: ScreenWakeLockAcquireOptions): Promise<ScreenWakeLockLease>;
```

Defined in: packages/octagonal-wheels/src/browser/wakeLock.ts:174

Acquires a logical lease for a lifecycle which cannot be represented by
one closure. Callers own the returned lease and must dispose it. Prefer
[run](#run) whenever the protected operation has a bounded callback.
Platform acquisition is best effort.

#### Parameters

| Parameter  | Type                                                                        |
| ---------- | --------------------------------------------------------------------------- |
| `options?` | [`ScreenWakeLockAcquireOptions`](../ScreenWakeLockAcquireOptions/README.md) |

#### Returns

`Promise`\<[`ScreenWakeLockLease`](../ScreenWakeLockLease/README.md)\>

---

### dispose()

```ts
dispose(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/browser/wakeLock.ts:181

Permanently disposes the manager, all logical leases, listeners, and any
held platform sentinel. The operation is idempotent. Pending platform
requests are released if they resolve later.

#### Returns

`Promise`\<`void`\>

---

### run()

```ts
run<T>(task: () => T | PromiseLike<T>, options?: ScreenWakeLockAcquireOptions): Promise<T>;
```

Defined in: packages/octagonal-wheels/src/browser/wakeLock.ts:166

Runs a task while holding a logical wake-lock lease.

This closure-based form is the recommended API because it releases the
lease in a `finally` block. Platform acquisition is best effort: an
unsupported API or a rejected request does not prevent the task from
running. Calling this method after manager disposal is an error.

#### Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

#### Parameters

| Parameter  | Type                                                                        |
| ---------- | --------------------------------------------------------------------------- |
| `task`     | () => `T` \| `PromiseLike`\<`T`\>                                           |
| `options?` | [`ScreenWakeLockAcquireOptions`](../ScreenWakeLockAcquireOptions/README.md) |

#### Returns

`Promise`\<`T`\>
