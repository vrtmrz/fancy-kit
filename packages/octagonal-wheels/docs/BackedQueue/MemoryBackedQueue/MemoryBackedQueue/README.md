[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [BackedQueue](../../README.md) / [MemoryBackedQueue](../README.md) / MemoryBackedQueue

# Class: MemoryBackedQueue\<T\>

Defined in: [src/BackedQueue/MemoryBackedQueue.ts:13](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/MemoryBackedQueue.ts#L13)

A simple in-memory backed queue.
All items are stored in memory and will be lost when the process exits.
This is mainly useful for testing or temporary queues.

## Extends

- [`BackedQueue`](../../BackedQueue/BackedQueue/README.md)\<`T`\>

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of items in the queue. |

## Constructors

### Constructor

```ts
new MemoryBackedQueue<T>(name: string): MemoryBackedQueue<T>;
```

Defined in: [src/BackedQueue/MemoryBackedQueue.ts:15](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/MemoryBackedQueue.ts#L15)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`MemoryBackedQueue`\<`T`\>

#### Overrides

[`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`constructor`](../../BackedQueue/BackedQueue/README.md#constructor)

## Properties

| Property | Modifier | Type | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="_name"></a> `_name` | `readonly` | `string` | Name of the queue. | - | [`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`_name`](../../BackedQueue/BackedQueue/README.md#_name) | [src/BackedQueue/BackedQueue.ts:98](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L98) |
| <a id="backend"></a> `backend` | `public` | [`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md)\<`T`\> | Backend store for the queue. | [`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`backend`](../../BackedQueue/BackedQueue/README.md#backend) | - | [src/BackedQueue/MemoryBackedQueue.ts:14](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/MemoryBackedQueue.ts#L14) |
| <a id="readypromise"></a> `readyPromise` | `protected` | `Promise`\<`void`\> | Promise that resolves when the queue is ready. | - | [`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`readyPromise`](../../BackedQueue/BackedQueue/README.md#readypromise) | [src/BackedQueue/BackedQueue.ts:38](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L38) |

## Accessors

### basePrefix

#### Get Signature

```ts
get basePrefix(): string;
```

Defined in: [src/BackedQueue/MemoryBackedQueue.ts:19](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/MemoryBackedQueue.ts#L19)

##### Returns

`string`

***

### isReady

#### Get Signature

```ts
get isReady(): Promise<void>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:39](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L39)

##### Returns

`Promise`\<`void`\>

#### Inherited from

[`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`isReady`](../../BackedQueue/BackedQueue/README.md#isready)

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

#### Inherited from

[`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`_queueToProcessing`](../../BackedQueue/BackedQueue/README.md#_queuetoprocessing)

***

### addDeadLetter()

```ts
protected addDeadLetter(key: string, item: T): Promise<void>;
```

Defined in: [src/BackedQueue/MemoryBackedQueue.ts:22](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/MemoryBackedQueue.ts#L22)

Add an item to the dead letter queue.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | Key of the item being added to the dead letter queue. |
| `item` | `T` | Item being added to the dead letter queue. |

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`addDeadLetter`](../../BackedQueue/BackedQueue/README.md#adddeadletter)

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

#### Inherited from

[`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`commit`](../../BackedQueue/BackedQueue/README.md#commit)

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

#### Inherited from

[`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`dequeue`](../../BackedQueue/BackedQueue/README.md#dequeue)

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

#### Inherited from

[`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`enqueue`](../../BackedQueue/BackedQueue/README.md#enqueue)

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

#### Inherited from

[`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`isAnyInFlight`](../../BackedQueue/BackedQueue/README.md#isanyinflight)

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

#### Inherited from

[`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`isQueueEmpty`](../../BackedQueue/BackedQueue/README.md#isqueueempty)

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

#### Inherited from

[`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`onDeadLetter`](../../BackedQueue/BackedQueue/README.md#ondeadletter)

***

### onDequeued()

```ts
protected onDequeued(): void;
```

Defined in: [src/BackedQueue/BackedQueue.ts:218](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L218)

Notify that an item has been dequeued.

#### Returns

`void`

#### Inherited from

[`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`onDequeued`](../../BackedQueue/BackedQueue/README.md#ondequeued)

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

#### Inherited from

[`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`onEnqueued`](../../BackedQueue/BackedQueue/README.md#onenqueued)

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

#### Inherited from

[`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`process`](../../BackedQueue/BackedQueue/README.md#process)

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

#### Inherited from

[`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`requeue`](../../BackedQueue/BackedQueue/README.md#requeue)

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

#### Inherited from

[`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`restoreToQueue`](../../BackedQueue/BackedQueue/README.md#restoretoqueue)

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

#### Inherited from

[`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`revoke`](../../BackedQueue/BackedQueue/README.md#revoke)

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

#### Inherited from

[`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`waitForEmptyQueue`](../../BackedQueue/BackedQueue/README.md#waitforemptyqueue)

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

#### Inherited from

[`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`waitForNext`](../../BackedQueue/BackedQueue/README.md#waitfornext)

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

#### Inherited from

[`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`waitNextDequeue`](../../BackedQueue/BackedQueue/README.md#waitnextdequeue)

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

#### Inherited from

[`BackedQueue`](../../BackedQueue/BackedQueue/README.md).[`waitNextEnqueued`](../../BackedQueue/BackedQueue/README.md#waitnextenqueued)
