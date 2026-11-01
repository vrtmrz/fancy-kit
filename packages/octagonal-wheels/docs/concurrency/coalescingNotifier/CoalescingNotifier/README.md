[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [coalescingNotifier](../README.md) / CoalescingNotifier

# Interface: CoalescingNotifier\<T\>

Defined in: packages/octagonal-wheels/src/concurrency/coalescingNotifier.ts:5

Delivers the latest pending update when a count or waiting limit is reached.

## Extends

- [`DisposableResource`](../../../resource/DisposableResource/README.md)

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Methods

### dispose()

```ts
dispose(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/coalescingNotifier.ts:11

Cancels the pending notification and permanently stops accepting updates.

#### Returns

`void`

#### Overrides

[`DisposableResource`](../../../resource/DisposableResource/README.md).[`dispose`](../../../resource/DisposableResource/README.md#dispose)

---

### flush()

```ts
flush(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/coalescingNotifier.ts:9

Delivers a pending value immediately; does nothing when none is pending.

#### Returns

`void`

---

### update()

```ts
update(value: T): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/coalescingNotifier.ts:7

Records the latest value. Calls after disposal do nothing.

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `value`   | `T`  |

#### Returns

`void`
