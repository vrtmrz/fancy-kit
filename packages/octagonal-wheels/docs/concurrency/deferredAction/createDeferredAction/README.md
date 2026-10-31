[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [deferredAction](../README.md) / createDeferredAction

# Function: createDeferredAction()

```ts
function createDeferredAction(
  callback: () => void,
  scheduleTimeout?: TimeoutScheduler,
): DeferredAction;
```

Defined in: packages/octagonal-wheels/src/concurrency/deferredAction.ts:77

Creates a deferred action for one replaceable, delayed callback.

## Parameters

| Parameter         | Type                                                | Default value           | Description                                                                                                  |
| ----------------- | --------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `callback`        | () => `void`                                        | `undefined`             | The callback to run once when a scheduled timeout expires.                                                   |
| `scheduleTimeout` | [`TimeoutScheduler`](../TimeoutScheduler/README.md) | `scheduleGlobalTimeout` | An injected scheduler. Defaults to the current global timer methods, resolved when scheduling or cancelling. |

## Returns

[`DeferredAction`](../DeferredAction/README.md)

An independent deferred action with no timeout scheduled initially.

## Remarks

Scheduling again cancels the previous registration before creating another.
The registration is released before invoking the callback, so the callback
may schedule another timeout. Its return value is ignored; exceptions
propagate to the scheduler. Scheduling and cancellation failures propagate
without retaining an active callback for the failed operation.

No host methods are read when this module is imported or a deferred action is
created. The injected scheduler determines timing; this deferred action does not
track elapsed time or change Promise cancellation semantics.
Cancellation during registration also releases the returned registration.

## Example

```ts
declare function refreshPreview(): void;
const refresh = createDeferredAction(refreshPreview);

function onInput() {
  refresh.schedule(250);
}
function onViewClosed() {
  refresh.dispose();
}
```

Repeated input replaces the pending timeout, so the preview runs after the
last quiet interval. Closing the view cancels pending work and ends its owner.
