[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [resource](../README.md) / DisposableResource

# Interface: DisposableResource

Defined in: packages/octagonal-wheels/src/resource.ts:15

An explicit cleanup capability, independent of standard disposal symbols.

The owner calls dispose when the resource's lifetime ends. Implementations
must prevent repeated calls from running cleanup more than once. Borrowers
use the resource without assuming responsibility for its disposal.

## Extended by

- [`OwnedResource`](../OwnedResource/README.md)
- [`DeferredAction`](../../concurrency/deferredAction/DeferredAction/README.md)
- [`CoalescingNotifier`](../../concurrency/coalescingNotifier/CoalescingNotifier/README.md)
- [`AsyncQueue`](../../iterable/asyncQueue/AsyncQueue/README.md)

## Methods

### dispose()

```ts
dispose(): void | Promise<void>;
```

Defined in: packages/octagonal-wheels/src/resource.ts:22

Releases owned resources synchronously or returns their cleanup promise.
Await the result when cleanup may be asynchronous. Failures propagate;
repeated calls must not retry cleanup. Other operations after disposal
follow the concrete resource's contract.

#### Returns

`void` \| `Promise`\<`void`\>
