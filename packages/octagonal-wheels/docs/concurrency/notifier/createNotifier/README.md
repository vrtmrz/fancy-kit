[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [notifier](../README.md) / createNotifier

# Function: createNotifier()

```ts
function createNotifier(): Notifier;
```

Defined in: packages/octagonal-wheels/src/concurrency/notifier.ts:32

Creates a notifier with independent state and no notification payload.

Notifications do not queue values or counts. A notification with no active
waiter is discarded. All current waiters share one promise, which resolves
on notification; future waits then use a new promise. The returned methods
are safe to pass as callbacks.

## Returns

[`Notifier`](../Notifier/README.md)

A notifier with wait and notify operations.
