[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [BackedQueue](../../README.md) / [PersistentIDBackedQueue](../README.md) / PersistentIDBBackedQueue

# Class: PersistentIDBBackedQueue\<T\>

Defined in: [src/BackedQueue/PersistentIDBBackedQueue.ts:9](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/PersistentIDBBackedQueue.ts#L9)

A persistent backed queue that tracks 'in-flight' processing keys.
Suitable for multi-worker scenarios.

## Extends

- [`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md)\<`T`\>

## Extended by

- [`HalfPersistentIDBBackedQueue`](../../HalfPersistentIDBackedQueue/HalfPersistentIDBBackedQueue/README.md)

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of items in the queue. |

## Constructors

### Constructor

```ts
new PersistentIDBBackedQueue<T>(name: string, storage: SimpleStoreCRUDSupportTransaction<T>): PersistentIDBBackedQueue<T>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:420](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L420)

Construct a new PersistentIDBackedQueueBase instance.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `name` | `string` | Queue name. |
| `storage` | [`SimpleStoreCRUDSupportTransaction`](../../../databases/simplestorebase/SimpleStoreCRUDSupportTransaction/README.md)\<`T`\> | Storage backend. |

#### Returns

`PersistentIDBBackedQueue`\<`T`\>

#### Inherited from

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`constructor`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#constructor)

## Properties

| Property | Modifier | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="_name"></a> `_name` | `readonly` | `string` | Name of the queue. | [`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`_name`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#_name) | [src/BackedQueue/BackedQueue.ts:98](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L98) |
| <a id="backend"></a> `backend` | `public` | [`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md)\<`T`\> | Backend store for the queue. | [`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`backend`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#backend) | [src/BackedQueue/BackedQueue.ts:391](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L391) |
| <a id="readypromise"></a> `readyPromise` | `protected` | `Promise`\<`void`\> | Promise that resolves when the queue is ready. | [`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`readyPromise`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#readypromise) | [src/BackedQueue/BackedQueue.ts:38](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L38) |

## Accessors

### basePrefix

#### Get Signature

```ts
get basePrefix(): string;
```

Defined in: [src/BackedQueue/PersistentIDBBackedQueue.ts:10](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/PersistentIDBBackedQueue.ts#L10)

Base prefix for the queue.

##### Returns

`string`

#### Overrides

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`basePrefix`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#baseprefix)

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

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`isReady`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#isready)

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

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`_queueToProcessing`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#_queuetoprocessing)

***

### addDeadLetter()

```ts
addDeadLetter(key: string, item: T): Promise<void>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:425](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L425)

Add an item to the dead letter queue.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | Key of the item being added to the dead letter queue. |
| `item` | `T` | Item being added to the dead letter queue. |

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`addDeadLetter`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#adddeadletter)

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

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`commit`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#commit)

***

### dequeue()

```ts
dequeue(options?: QueryOptions): Promise<DequeuedItem<T>>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:430](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L430)

Dequeue an item.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options?` | [`QueryOptions`](../../BackedQueueTypes/QueryOptions/README.md) | Dequeue options. |

#### Returns

`Promise`\<[`DequeuedItem`](../../BackedQueueTypes/DequeuedItem/README.md)\<`T`\>\>

Dequeued item.

#### Inherited from

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`dequeue`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#dequeue)

***

### enqueue()

```ts
enqueue(item: T): Promise<string>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:434](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L434)

Enqueue an item.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `item` | `T` | Item to enqueue. |

#### Returns

`Promise`\<`string`\>

Key of the enqueued item.

#### Inherited from

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`enqueue`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#enqueue)

***

### init()

```ts
init(storage: SimpleStoreCRUDSupportTransaction<T>): Promise<void>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:400](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L400)

Initialise the queue with storage.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `storage` | [`SimpleStoreCRUDSupportTransaction`](../../../databases/simplestorebase/SimpleStoreCRUDSupportTransaction/README.md)\<`T`\> | Storage backend. |

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`init`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#init)

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

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`isAnyInFlight`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#isanyinflight)

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

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`isQueueEmpty`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#isqueueempty)

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

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`onDeadLetter`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#ondeadletter)

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

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`onDequeued`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#ondequeued)

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

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`onEnqueued`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#onenqueued)

***

### process()

```ts
process(options: QueryOptions, callback: DequeueCallback<T>): Promise<void>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:439](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L439)

Dequeue and process an item via a callback.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`QueryOptions`](../../BackedQueueTypes/QueryOptions/README.md) | Dequeue options. |
| `callback` | [`DequeueCallback`](../../BackedQueueTypes/DequeueCallback/README.md)\<`T`\> | Processing callback. |

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`process`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#process)

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

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`requeue`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#requeue)

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

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`restoreToQueue`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#restoretoqueue)

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

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`revoke`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#revoke)

***

### waitForEmptyQueue()

```ts
waitForEmptyQueue(options?: QueryOptions): Promise<void>;
```

Defined in: [src/BackedQueue/BackedQueue.ts:443](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueue.ts#L443)

Wait until the queue becomes empty.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options?` | [`QueryOptions`](../../BackedQueueTypes/QueryOptions/README.md) | Query options. |

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`waitForEmptyQueue`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#waitforemptyqueue)

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

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`waitForNext`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#waitfornext)

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

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`waitNextDequeue`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#waitnextdequeue)

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

[`PersistentIDBBackedQueueBase`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md).[`waitNextEnqueued`](../../BackedQueue/PersistentIDBBackedQueueBase/README.md#waitnextenqueued)
