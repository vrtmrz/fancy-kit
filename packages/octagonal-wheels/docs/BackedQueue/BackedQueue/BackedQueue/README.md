[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [BackedQueue](../../README.md) / [BackedQueue](../README.md) / BackedQueue

# Abstract Class: BackedQueue\<T\>

Defined in: [src/BackedQueue/BackedQueue.ts:30](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L30)

Abstract base class for a backed queue.
We employ simple in-memory tracking for primary implementation purposes.
Operations prior to commit are non-atomic, must be idempotent, and must avoid side effects until commit completes.

## Extended by

- [`PersistentIDBBackedQueueBase`](../PersistentIDBBackedQueueBase/README.md)
- [`MemoryBackedQueue`](../../MemoryBackedQueue/MemoryBackedQueue/README.md)

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | Type of items in the queue. |

## Constructors

### Constructor

```ts
new BackedQueue<T>(name: string): BackedQueue<T>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:103](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L103)

Construct a new BackedQueue instance.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `name` | `string` | Queue name. |

#### Returns

`BackedQueue`\<`T`\>

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="_name"></a> `_name` | `readonly` | `string` | Name of the queue. | [src/BackedQueue/BackedQueue.ts:98](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L98) |
| <a id="backend"></a> `backend` | `abstract` | [`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md)\<`T`\> | Backend store for the queue. | [src/BackedQueue/BackedQueue.ts:34](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L34) |
| <a id="readypromise"></a> `readyPromise` | `protected` | `Promise`\<`void`\> | Promise that resolves when the queue is ready. | [src/BackedQueue/BackedQueue.ts:38](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L38) |

## Accessors

### isReady

#### Get Signature

```ts
get isReady(): Promise<void>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:39](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L39)

##### Returns

`Promise`\<`void`\>

## Methods

### \_queueToProcessing()

```ts
protected _queueToProcessing(tx: QueueBackendTransaction<T>, key: string): Promise<void>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:228](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L228)

Move an item from queue to processing.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tx` | [`QueueBackendTransaction`](../../QueueBackendTypes/QueueBackendTransaction/README.md)\<`T`\> | Backend store transaction. |
| `key` | `string` | Key of the item to move. |

#### Returns

`Promise`\<`void`\>

***

### addDeadLetter()

```ts
abstract protected addDeadLetter(key: string, item: T): Promise<void>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:47](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L47)

Add an item to the dead letter queue.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | Key of the item being added to the dead letter queue. |
| `item` | `T` | Item being added to the dead letter queue. |

#### Returns

`Promise`\<`void`\>

***

### commit()

```ts
commit(key: string): Promise<void>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:53](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L53)

Commit a processed item.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | Key of the item to commit. |

#### Returns

`Promise`\<`void`\>

***

### dequeue()

```ts
dequeue(options?: QueryOptions): Promise<DequeuedItem<T>>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:317](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L317)

Dequeue an item.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options?` | [`QueryOptions`](../../BackedQueueTypes/QueryOptions/README.md) | Dequeue options. |

#### Returns

`Promise`\<[`DequeuedItem`](../../BackedQueueTypes/DequeuedItem/README.md)\<`T`\>\>

Dequeued item.

***

### enqueue()

```ts
enqueue(item: T): Promise<string>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:326](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L326)

Enqueue an item.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `item` | `T` | Item to enqueue. |

#### Returns

`Promise`\<`string`\>

Key of the enqueued item.

***

### isAnyInFlight()

```ts
isAnyInFlight(): Promise<boolean>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:269](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L269)

Check if any items are in flight.

#### Returns

`Promise`\<`boolean`\>

True if at least one item is in flight, false otherwise.

***

### isQueueEmpty()

```ts
isQueueEmpty(): Promise<boolean>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:261](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L261)

Check if the queue is empty.

#### Returns

`Promise`\<`boolean`\>

True if empty, false otherwise.

***

### onDeadLetter()

```ts
protected onDeadLetter(
   key: string, 
   item: T, 
reason: Error): Promise<void>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:113](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L113)

Handle an item added to the dead letter queue.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | Key of the item added to the dead letter queue. |
| `item` | `T` | Item added to the dead letter queue. |
| `reason` | `Error` | Reason for dead lettering. |

#### Returns

`Promise`\<`void`\>

***

### onDequeued()

```ts
protected onDequeued(): void;
```

Defined in: [src/BackedQueue/BackedQueue.ts:218](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L218)

Notify that an item has been dequeued.

#### Returns

`void`

***

### onEnqueued()

```ts
protected onEnqueued(): void;
```

Defined in: [src/BackedQueue/BackedQueue.ts:209](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L209)

Notify that an item has been enqueued.
We allow spurious wake-ups for robustness.

#### Returns

`void`

***

### process()

```ts
process(options: QueryOptions, callback: DequeueCallback<T>): Promise<void>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:338](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L338)

Dequeue and process an item via a callback.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`QueryOptions`](../../BackedQueueTypes/QueryOptions/README.md) | Dequeue options. |
| `callback` | [`DequeueCallback`](../../BackedQueueTypes/DequeueCallback/README.md)\<`T`\> | Processing callback. |

#### Returns

`Promise`\<`void`\>

***

### requeue()

```ts
requeue(key: string, position: RequestPositions): Promise<void>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:65](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L65)

Requeue an item.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `key` | `string` | `undefined` | Key of the item to requeue. |
| `position` | [`RequestPositions`](../../BackedQueueTypes/RequestPositions/README.md) | `RequeuePosition.LAST` | Target position for the requeued item. |

#### Returns

`Promise`\<`void`\>

***

### restoreToQueue()

```ts
protected restoreToQueue(key: string): Promise<void>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:247](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L247)

Restore an item from processing back to the queue.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | Key of the item to restore. |

#### Returns

`Promise`\<`void`\>

Promise that resolves when complete.

***

### revoke()

```ts
revoke(key: string): Promise<void>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:88](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L88)

Revoke an item from queue or processing.
If the item is in the queue, we remove it.
In-flight items are marked revoked and are not committed. Call this when processing determines removal.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | Key of the item to revoke. |

#### Returns

`Promise`\<`void`\>

***

### waitForEmptyQueue()

```ts
waitForEmptyQueue(options?: QueryOptions): Promise<void>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:373](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L373)

Wait until the queue becomes empty.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options?` | [`QueryOptions`](../../BackedQueueTypes/QueryOptions/README.md) | Query options. |

#### Returns

`Promise`\<`void`\>

***

### waitForNext()

```ts
protected waitForNext(options?: QueryOptions): Promise<string>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:279](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L279)

Wait until at least one item is available.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options?` | [`QueryOptions`](../../BackedQueueTypes/QueryOptions/README.md) | Query options (same shape as DequeueOptions, without dequeue). |

#### Returns

`Promise`\<`string`\>

***

### waitNextDequeue()

```ts
protected waitNextDequeue(options?: QueryOptions): Promise<void>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:193](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L193)

Wait for the next dequeue.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options?` | [`QueryOptions`](../../BackedQueueTypes/QueryOptions/README.md) | Query options. |

#### Returns

`Promise`\<`void`\>

***

### waitNextEnqueued()

```ts
protected waitNextEnqueued(options?: QueryOptions): Promise<void>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:177](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L177)

Wait for the next enqueue.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options?` | [`QueryOptions`](../../BackedQueueTypes/QueryOptions/README.md) | Query options. |

#### Returns

`Promise`\<`void`\>
