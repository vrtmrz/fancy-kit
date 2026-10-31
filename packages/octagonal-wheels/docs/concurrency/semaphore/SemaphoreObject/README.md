[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [semaphore](../README.md) / SemaphoreObject

# Type Alias: SemaphoreObject

```ts
type SemaphoreObject = {
  waiting: number;
  acquire: Promise<SemaphoreReleaser>;
  tryAcquire: Promise<false | SemaphoreReleaser>;
};
```

Defined in: packages/octagonal-wheels/src/concurrency/semaphore.internal.ts:10

## Properties

| Property                       | Type     | Defined in                                                         |
| ------------------------------ | -------- | ------------------------------------------------------------------ |
| <a id="waiting"></a> `waiting` | `number` | packages/octagonal-wheels/src/concurrency/semaphore.internal.ts:14 |

## Methods

### acquire()

```ts
acquire(quantity?: number): Promise<SemaphoreReleaser>;
```

Defined in: packages/octagonal-wheels/src/concurrency/semaphore.internal.ts:11

#### Parameters

| Parameter   | Type     |
| ----------- | -------- |
| `quantity?` | `number` |

#### Returns

`Promise`\<[`SemaphoreReleaser`](../SemaphoreReleaser/README.md)\>

---

### tryAcquire()

```ts
tryAcquire(quantity?: number, timeout?: number): Promise<false | SemaphoreReleaser>;
```

Defined in: packages/octagonal-wheels/src/concurrency/semaphore.internal.ts:12

#### Parameters

| Parameter   | Type     |
| ----------- | -------- |
| `quantity?` | `number` |
| `timeout?`  | `number` |

#### Returns

`Promise`\<`false` \| [`SemaphoreReleaser`](../SemaphoreReleaser/README.md)\>
