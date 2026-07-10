[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [semaphore](../README.md) / SemaphoreObject

# Type Alias: SemaphoreObject

```ts
type SemaphoreObject = {
  waiting: number;
  acquire: Promise<SemaphoreReleaser>;
  tryAcquire: Promise<false | SemaphoreReleaser>;
};
```

Defined in: [src/concurrency/semaphore\_v2.ts:10](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/semaphore_v2.ts#L10)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="waiting"></a> `waiting` | `number` | [src/concurrency/semaphore\_v2.ts:14](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/semaphore_v2.ts#L14) |

## Methods

### acquire()

```ts
acquire(quantity?: number): Promise<SemaphoreReleaser>;
```

Defined in: [src/concurrency/semaphore\_v2.ts:11](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/semaphore_v2.ts#L11)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `quantity?` | `number` |

#### Returns

`Promise`\<[`SemaphoreReleaser`](../SemaphoreReleaser/README.md)\>

***

### tryAcquire()

```ts
tryAcquire(quantity?: number, timeout?: number): Promise<false | SemaphoreReleaser>;
```

Defined in: [src/concurrency/semaphore\_v2.ts:12](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/semaphore_v2.ts#L12)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `quantity?` | `number` |
| `timeout?` | `number` |

#### Returns

`Promise`\<`false` \| [`SemaphoreReleaser`](../SemaphoreReleaser/README.md)\>
