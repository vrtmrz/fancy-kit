[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [bulk](../README.md) / WaitSemaphore

# Class: WaitSemaphore

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:9

A semaphore that can be awaited until it is free.
It can be locked and freed.
When locked, the `nextFree` promise will not resolve until it is freed.
It can be aborted with an AbortController.

## Constructors

### Constructor

```ts
new WaitSemaphore(ac?: AbortController): WaitSemaphore;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:17

Creates a WaitSemaphore.

#### Parameters

| Parameter | Type              | Description                                     |
| --------- | ----------------- | ----------------------------------------------- |
| `ac?`     | `AbortController` | AbortController to abort waiting for free state |

#### Returns

`WaitSemaphore`

## Accessors

### isFree

#### Get Signature

```ts
get isFree(): boolean;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:32

Indicates whether the semaphore is free.

##### Returns

`boolean`

---

### nextFree

#### Get Signature

```ts
get nextFree(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:40

Promise that resolves when the semaphore is free.
If the semaphore is already free, it resolves immediately.

##### Returns

`Promise`\<`void`\>

## Methods

### free()

```ts
free(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:60

Frees the semaphore, resolving the `nextFree` promise.

#### Returns

`void`

---

### lock()

```ts
lock(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:53

Locks the semaphore.

#### Returns

`void`
