[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [browser](../README.md) / ScreenWakeLockDocument

# Interface: ScreenWakeLockDocument

Defined in: packages/octagonal-wheels/src/browser/wakeLock.ts:28

The minimal document visibility contract used by the manager.

## Properties

| Property                                       | Modifier   | Type     | Description                                                                        | Defined in                                           |
| ---------------------------------------------- | ---------- | -------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------- |
| <a id="visibilitystate"></a> `visibilityState` | `readonly` | `string` | The current visibility state. A wake lock is requested only while it is `visible`. | packages/octagonal-wheels/src/browser/wakeLock.ts:30 |

## Methods

### addEventListener()

```ts
addEventListener(type: "visibilitychange", listener: () => void): void;
```

Defined in: packages/octagonal-wheels/src/browser/wakeLock.ts:33

Adds a document visibility listener.

#### Parameters

| Parameter  | Type                 |
| ---------- | -------------------- |
| `type`     | `"visibilitychange"` |
| `listener` | () => `void`         |

#### Returns

`void`

---

### removeEventListener()

```ts
removeEventListener(type: "visibilitychange", listener: () => void): void;
```

Defined in: packages/octagonal-wheels/src/browser/wakeLock.ts:36

Removes a document visibility listener.

#### Parameters

| Parameter  | Type                 |
| ---------- | -------------------- |
| `type`     | `"visibilitychange"` |
| `listener` | () => `void`         |

#### Returns

`void`
