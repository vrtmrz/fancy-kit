[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [browser](../README.md) / ScreenWakeLockSentinel

# Interface: ScreenWakeLockSentinel

Defined in: packages/octagonal-wheels/src/browser/wakeLock.ts:13

The minimal wake-lock sentinel contract used by the manager.

## Properties

| Property                         | Modifier   | Type      | Description                                                | Defined in                                           |
| -------------------------------- | ---------- | --------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| <a id="released"></a> `released` | `readonly` | `boolean` | Whether the user agent has already released this sentinel. | packages/octagonal-wheels/src/browser/wakeLock.ts:15 |

## Methods

### addEventListener()

```ts
addEventListener(type: "release", listener: () => void): void;
```

Defined in: packages/octagonal-wheels/src/browser/wakeLock.ts:18

Adds a listener for the sentinel's `release` event.

#### Parameters

| Parameter  | Type         |
| ---------- | ------------ |
| `type`     | `"release"`  |
| `listener` | () => `void` |

#### Returns

`void`

---

### release()

```ts
release(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/browser/wakeLock.ts:24

Releases the wake lock represented by this sentinel.

#### Returns

`Promise`\<`void`\>

---

### removeEventListener()

```ts
removeEventListener(type: "release", listener: () => void): void;
```

Defined in: packages/octagonal-wheels/src/browser/wakeLock.ts:21

Removes a listener previously added for the sentinel's `release` event.

#### Parameters

| Parameter  | Type         |
| ---------- | ------------ |
| `type`     | `"release"`  |
| `listener` | () => `void` |

#### Returns

`void`
