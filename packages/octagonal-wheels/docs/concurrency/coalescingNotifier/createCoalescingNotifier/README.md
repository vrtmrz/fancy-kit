[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [coalescingNotifier](../README.md) / createCoalescingNotifier

# Function: createCoalescingNotifier()

```ts
function createCoalescingNotifier<T>(
  options: CoalescingNotifierOptions<T>,
): CoalescingNotifier<T>;
```

Defined in: packages/octagonal-wheels/src/concurrency/coalescingNotifier.ts:68

Coalesces updates until either their count increase or their waiting limit
reaches its threshold. At least one limit must be provided. The count starts
at zero; a notification establishes the next count baseline.

Values are retained by reference, so callers wanting snapshots should pass
fresh values. No timer runs without a pending update. Before invoking onNotify,
flush clears the pending value, records its count as the next baseline, and
cancels the timer, allowing reentrant updates. Synchronous callback and
scheduler errors propagate and are not retried. A timer-triggered callback
error propagates through the scheduler's invocation, not the update that
scheduled it. An onNotify promise is neither awaited nor returned, and its
rejection must be handled inside the callback. Dispose discards pending work;
call flush first when a final update is wanted.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Parameters

| Parameter | Type                                                                         | Description                                            |
| --------- | ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| `options` | [`CoalescingNotifierOptions`](../CoalescingNotifierOptions/README.md)\<`T`\> | Count, timing, and callback options for this notifier. |

## Returns

[`CoalescingNotifier`](../CoalescingNotifier/README.md)\<`T`\>

An independently owned notifier for coalescing update callbacks.

## Example

Connect coalesced updates to the value-less notifier:

```ts
import { createCoalescingNotifier } from "octagonal-wheels/concurrency/coalescingNotifier";
import { createNotifier } from "octagonal-wheels/concurrency/notifier";

const signal = createNotifier();
const progress = createCoalescingNotifier<number>({
  everyCount: 10,
  onNotify: signal.notify,
});
```
