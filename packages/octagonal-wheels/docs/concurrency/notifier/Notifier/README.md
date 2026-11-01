[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [notifier](../README.md) / Notifier

# Interface: Notifier

Defined in: packages/octagonal-wheels/src/concurrency/notifier.ts:4

A notifier whose current waiters share one notification without a payload.

## Methods

### notify()

```ts
notify(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/notifier.ts:19

Resolves the current wait group.

Notifications without a current waiter are discarded. This function can
be passed as a callback without losing its notifier instance.

#### Returns

`void`

---

### wait()

```ts
wait(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/concurrency/notifier.ts:12

Waits for the next notification.

Calls made before the next notification return the same promise. Each
notification resolves only the current group; a wait registered later
belongs to a fresh group.

#### Returns

`Promise`\<`void`\>
