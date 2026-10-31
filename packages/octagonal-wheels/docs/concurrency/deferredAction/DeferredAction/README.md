[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [deferredAction](../README.md) / DeferredAction

# Interface: DeferredAction

Defined in: packages/octagonal-wheels/src/concurrency/deferredAction.ts:15

Owns at most one pending callback over an explicitly disposable deferred-action lifetime.

## Extends

- [`DisposableResource`](../../../resource/DisposableResource/README.md)

## Methods

### cancel()

```ts
cancel(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/deferredAction.ts:29

Cancels the pending registration, allowing a later schedule.

Repeated calls without a pending registration do nothing. A cancelled
callback remains inactive even if the scheduler later invokes it.

#### Returns

`void`

---

### dispose()

```ts
dispose(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/deferredAction.ts:36

Cancels pending work and permanently prevents further scheduling.

Disposal is idempotent. A cancellation failure propagates after the
action has become disposed and the pending callback is inactive.

#### Returns

`void`

#### Overrides

[`DisposableResource`](../../../resource/DisposableResource/README.md).[`dispose`](../../../resource/DisposableResource/README.md#dispose)

---

### schedule()

```ts
schedule(delayMs: number): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/deferredAction.ts:22

Replaces any pending callback with a new timeout.

The delay is passed unchanged to the scheduler. Calls after disposal do
nothing. This does not cancel work which the callback has already started.

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `delayMs` | `number` |

#### Returns

`void`
