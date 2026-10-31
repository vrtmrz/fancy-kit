[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [semaphore](../README.md) / SemaphoreAcquisition

# Interface: SemaphoreAcquisition

Defined in: packages/octagonal-wheels/src/concurrency/semaphore.scoped.ts:53

Minimal semaphore capability accepted by the permit preparation step.

Implementations retain their own queue and concurrency policy. Calling
acquire without arguments uses that implementation's existing defaults.

## Methods

### acquire()

```ts
acquire(): PromiseLike<() => void>;
```

Defined in: packages/octagonal-wheels/src/concurrency/semaphore.scoped.ts:55

Acquires one permit and resolves to its release function.

#### Returns

`PromiseLike`\<() => `void`\>
