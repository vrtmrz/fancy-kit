[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [iterable](../../README.md) / [asyncQueue](../README.md) / AsyncQueue

# Interface: AsyncQueue\<T\>

Defined in: packages/octagonal-wheels/src/iterable/asyncQueue.ts:8

A disposable FIFO queue with one asynchronous iterator.

## Extends

- `AsyncIterable`\<`T`\>.[`DisposableResource`](../../../resource/DisposableResource/README.md)

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Properties

| Property                 | Modifier   | Type     | Description                                      | Defined in                                              |
| ------------------------ | ---------- | -------- | ------------------------------------------------ | ------------------------------------------------------- |
| <a id="size"></a> `size` | `readonly` | `number` | Number of unread values still held in the queue. | packages/octagonal-wheels/src/iterable/asyncQueue.ts:10 |

## Methods

### \[asyncIterator\]()

```ts
asyncIterator: AsyncIterator<T>;
```

Defined in: packages/octagonal-wheels/src/iterable/asyncQueue.ts:39

Acquires the queue's single iterator.

A second acquisition throws. The iterator's return() disposes the queue,
and only one empty-queue next() may be pending at a time. A next() result
already claimed by a waiting reader cannot be revoked by later disposal.

#### Returns

`AsyncIterator`\<`T`\>

#### Overrides

```ts
AsyncIterable.[asyncIterator]
```

---

### dispose()

```ts
dispose(): void;
```

Defined in: packages/octagonal-wheels/src/iterable/asyncQueue.ts:31

Stops accepting values, drops all buffered references, and wakes a waiting
empty read as done.

Repeated calls are harmless. A value already claimed for a pending
next() result cannot be revoked by later disposal.

#### Returns

`void`

#### Overrides

[`DisposableResource`](../../../resource/DisposableResource/README.md).[`dispose`](../../../resource/DisposableResource/README.md#dispose)

---

### enqueue()

```ts
enqueue(item: T): void;
```

Defined in: packages/octagonal-wheels/src/iterable/asyncQueue.ts:16

Appends one value in FIFO order.

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `item`    | `T`  |

#### Returns

`void`

#### Throws

Error after finish or dispose.

---

### finish()

```ts
finish(): void;
```

Defined in: packages/octagonal-wheels/src/iterable/asyncQueue.ts:23

Stops accepting values and lets the iterator drain buffered values.

Repeated calls are harmless. Disposal after finish discards any remaining
buffered values.

#### Returns

`void`
