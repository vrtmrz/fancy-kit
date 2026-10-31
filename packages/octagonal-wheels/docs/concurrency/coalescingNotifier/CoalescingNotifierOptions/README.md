[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [coalescingNotifier](../README.md) / CoalescingNotifierOptions

# Interface: CoalescingNotifierOptions\<T\>

Defined in: packages/octagonal-wheels/src/concurrency/coalescingNotifier.ts:15

Count and waiting limits for one independently owned notifier.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Properties

| Property                                        | Modifier   | Type                                                                  | Description                                                                                                                                                                                                                                                                                                                  | Defined in                                                         |
| ----------------------------------------------- | ---------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| <a id="everycount"></a> `everyCount?`           | `readonly` | `number`                                                              | Positive integer increase since the last notification; omitted for time-only notification.                                                                                                                                                                                                                                   | packages/octagonal-wheels/src/concurrency/coalescingNotifier.ts:25 |
| <a id="getcount"></a> `getCount?`               | `readonly` | (`value`: `T`) => `number`                                            | Extracts a cumulative, non-decreasing count. Without it, each update counts as one.                                                                                                                                                                                                                                          | packages/octagonal-wheels/src/concurrency/coalescingNotifier.ts:29 |
| <a id="leading"></a> `leading?`                 | `readonly` | `boolean`                                                             | Delivers the first update immediately. Defaults to false.                                                                                                                                                                                                                                                                    | packages/octagonal-wheels/src/concurrency/coalescingNotifier.ts:31 |
| <a id="maxwaitms"></a> `maxWaitMs?`             | `readonly` | `number`                                                              | Maximum wait from the first pending update. Later updates do not postpone it.                                                                                                                                                                                                                                                | packages/octagonal-wheels/src/concurrency/coalescingNotifier.ts:27 |
| <a id="onnotify"></a> `onNotify`                | `readonly` | (`value`: `T`) => `void`                                              | Receives the latest value synchronously and has a `void` callback contract. Synchronous throws propagate from `update` or `flush`, or through the scheduler's invocation of a delayed callback. A returned promise is neither awaited nor returned, and its rejection is not handled; handle rejections inside the callback. | packages/octagonal-wheels/src/concurrency/coalescingNotifier.ts:23 |
| <a id="scheduletimeout"></a> `scheduleTimeout?` | `readonly` | [`TimeoutScheduler`](../../deferredAction/TimeoutScheduler/README.md) | Injects the timer boundary; the default uses the current global timer methods.                                                                                                                                                                                                                                               | packages/octagonal-wheels/src/concurrency/coalescingNotifier.ts:33 |
