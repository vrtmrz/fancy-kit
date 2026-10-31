[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [deferredAction](../README.md) / TimeoutScheduler

# Type Alias: TimeoutScheduler

```ts
type TimeoutScheduler = (callback: () => void, delayMs: number) => () => void;
```

Defined in: packages/octagonal-wheels/src/concurrency/deferredAction.ts:10

Schedules one asynchronous callback and returns its cancellation function.

The callback must not run before this function returns. The returned function
releases only this registration. Wrap host methods to retain their receiver.
Scheduling and cancellation failures are allowed to propagate.

## Parameters

| Parameter  | Type         |
| ---------- | ------------ |
| `callback` | () => `void` |
| `delayMs`  | `number`     |

## Returns

() => `void`
