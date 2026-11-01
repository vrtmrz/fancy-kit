[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [browser](../README.md) / ScreenWakeLockProvider

# Interface: ScreenWakeLockProvider

Defined in: packages/octagonal-wheels/src/browser/wakeLock.ts:7

The minimal browser capability required to request a screen wake lock.

Consumers may inject this interface to test wake-lock behaviour without a
browser or to adapt a platform-specific implementation later.

## Methods

### request()

```ts
request(type: "screen"): Promise<ScreenWakeLockSentinel>;
```

Defined in: packages/octagonal-wheels/src/browser/wakeLock.ts:9

Requests a screen wake lock.

#### Parameters

| Parameter | Type       |
| --------- | ---------- |
| `type`    | `"screen"` |

#### Returns

`Promise`\<[`ScreenWakeLockSentinel`](../ScreenWakeLockSentinel/README.md)\>
