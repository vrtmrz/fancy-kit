[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [BackedQueue](../../README.md) / [QueueBackendMemory](../README.md) / QueueBackendMemory

# Class: QueueBackendMemory\<T\>

Defined in: packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts:8

A simple in-memory backend store for testing purposes.

## Type Parameters

| Type Parameter | Description                     |
| -------------- | ------------------------------- |
| `T`            | The type of items in the queue. |

## Implements

- [`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md)\<`T`\>

## Constructors

### Constructor

```ts
new QueueBackendMemory<T>(
   name: string,
   basePrefix: string,
   shouldBypass?: (key: string) => boolean,
   base?: {
  incrementalId: number;
  queueMapBase: Map<string, T>;
  sessionRandom: number;
  startupTime: number;
}): QueueBackendMemory<T>;
```

Defined in: packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts:25

#### Parameters

| Parameter             | Type                                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `name`                | `string`                                                                                                                     |
| `basePrefix`          | `string`                                                                                                                     |
| `shouldBypass?`       | (`key`: `string`) => `boolean`                                                                                               |
| `base?`               | \{ `incrementalId`: `number`; `queueMapBase`: `Map`\<`string`, `T`\>; `sessionRandom`: `number`; `startupTime`: `number`; \} |
| `base.incrementalId?` | `number`                                                                                                                     |
| `base.queueMapBase?`  | `Map`\<`string`, `T`\>                                                                                                       |
| `base.sessionRandom?` | `number`                                                                                                                     |
| `base.startupTime?`   | `number`                                                                                                                     |

#### Returns

`QueueBackendMemory`\<`T`\>

## Properties

| Property                                         | Modifier    | Type                           | Default value | Defined in                                                         |
| ------------------------------------------------ | ----------- | ------------------------------ | ------------- | ------------------------------------------------------------------ |
| <a id="_baseprefix"></a> `_basePrefix`           | `readonly`  | `string`                       | `undefined`   | packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts:12 |
| <a id="_incrementalid"></a> `_incrementalId`     | `protected` | `number`                       | `0`           | packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts:16 |
| <a id="_name"></a> `_name`                       | `readonly`  | `string`                       | `undefined`   | packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts:11 |
| <a id="_sessionrandom"></a> `_sessionRandom`     | `protected` | `number`                       | `undefined`   | packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts:15 |
| <a id="_shouldbypasskey"></a> `_shouldBypassKey` | `protected` | (`key`: `string`) => `boolean` | `undefined`   | packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts:17 |
| <a id="_startuptime"></a> `_startupTime`         | `protected` | `number`                       | `undefined`   | packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts:14 |

## Accessors

### prefix

#### Get Signature

```ts
get prefix(): string;
```

Defined in: packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts:18

A prefix used for queue items.
This prefix should not be included in processingPrefix.

##### Returns

`string`

A prefix used for queue items.
This prefix should not be included in processingPrefix.

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`prefix`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#prefix)

---

### processingPrefix

#### Get Signature

```ts
get processingPrefix(): string;
```

Defined in: packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts:21

A prefix used for processing items.
This prefix should not be included in prefix.

##### Returns

`string`

A prefix used for processing items.
This prefix should not be included in prefix.

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`processingPrefix`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#processingprefix)

## Methods

### atomic()

```ts
atomic<U>(callback: (store: QueueBackendTransaction<T>) => Promise<U>): Promise<U>;
```

Defined in: packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts:84

Performs the callback within a transaction.

#### Type Parameters

| Type Parameter |
| -------------- |
| `U`            |

#### Parameters

| Parameter  | Type                                                                                                                         | Description                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `callback` | (`store`: [`QueueBackendTransaction`](../../QueueBackendTypes/QueueBackendTransaction/README.md)\<`T`\>) => `Promise`\<`U`\> | The function to be performed within the transaction. |

#### Returns

`Promise`\<`U`\>

A promise that resolves to the callback result.
Most backends support transactions confined to a single microtask or a short chain limited to database operations.
Yielding control (for example, awaiting non-storage work or timers) risks inconsistent or partially applied data.
Keep transactional logic brief and focused on storage operations.

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`atomic`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#atomic)

---

### deleteProcessingItem()

```ts
deleteProcessingItem(key: string): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts:77

Deletes a processing item associated with the specified key.

#### Parameters

| Parameter | Type     | Description                                                |
| --------- | -------- | ---------------------------------------------------------- |
| `key`     | `string` | The key associated with the processing item to be deleted. |

#### Returns

`Promise`\<`void`\>

A promise that resolves when the item has been deleted.

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`deleteProcessingItem`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#deleteprocessingitem)

---

### deleteQueueItem()

```ts
deleteQueueItem(key: string): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts:63

Deletes a queued item associated with the specified key.

#### Parameters

| Parameter | Type     | Description                                            |
| --------- | -------- | ------------------------------------------------------ |
| `key`     | `string` | The key associated with the queued item to be deleted. |

#### Returns

`Promise`\<`void`\>

A promise that resolves when the item has been deleted.

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`deleteQueueItem`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#deletequeueitem)

---

### getNextQueueKey()

```ts
getNextQueueKey(): Promise<string | undefined>;
```

Defined in: packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts:111

Retrieves the next available queue key.

#### Returns

`Promise`\<`string` \| `undefined`\>

A promise that resolves to the next queue key, or undefined if none is available.

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`getNextQueueKey`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#getnextqueuekey)

---

### getProcessingItem()

```ts
getProcessingItem(key: string): Promise<T | undefined>;
```

Defined in: packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts:68

Retrieves a processing item associated with the specified key.

#### Parameters

| Parameter | Type     | Description                                  |
| --------- | -------- | -------------------------------------------- |
| `key`     | `string` | The key associated with the processing item. |

#### Returns

`Promise`\<`T` \| `undefined`\>

A promise that resolves to the processing item, or undefined if not found.

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`getProcessingItem`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#getprocessingitem)

---

### getQueuedItem()

```ts
getQueuedItem(key: string): Promise<T | undefined>;
```

Defined in: packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts:54

Retrieves a queued item associated with the specified key.

#### Parameters

| Parameter | Type     | Description                              |
| --------- | -------- | ---------------------------------------- |
| `key`     | `string` | The key associated with the queued item. |

#### Returns

`Promise`\<`T` \| `undefined`\>

A promise that resolves to the queued item, or undefined if not found.

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`getQueuedItem`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#getqueueditem)

---

### issueNewQueueKey()

```ts
issueNewQueueKey(): string;
```

Defined in: packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts:130

Issues a new queue key.

#### Returns

`string`

The newly issued queue key.

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`issueNewQueueKey`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#issuenewqueuekey)

---

### keys()

```ts
keys(
   from: string | undefined,
   to: string | undefined,
count?: number): Promise<string[]>;
```

Defined in: packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts:98

Retrieves keys within the specified range, optionally limiting the number of results.

#### Parameters

| Parameter | Type                    | Description                             |
| --------- | ----------------------- | --------------------------------------- |
| `from`    | `string` \| `undefined` | The starting key (inclusive).           |
| `to`      | `string` \| `undefined` | The ending key (inclusive).             |
| `count?`  | `number`                | The maximum number of keys to retrieve. |

#### Returns

`Promise`\<`string`[]\>

A promise that resolves to an array of keys.

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`keys`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#keys)

---

### setProcessingItem()

```ts
setProcessingItem(key: string, item: T): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts:72

Sets an item as a processing item associated with the specified key.

#### Parameters

| Parameter | Type     | Description                                  |
| --------- | -------- | -------------------------------------------- |
| `key`     | `string` | The key associated with the processing item. |
| `item`    | `T`      | The item to be set as processing.            |

#### Returns

`Promise`\<`void`\>

A promise that resolves when the item has been set.

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`setProcessingItem`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#setprocessingitem)

---

### setQueueItem()

```ts
setQueueItem(key: string, item: T): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts:58

Sets an item in the queue associated with the specified key.

#### Parameters

| Parameter | Type     | Description                             |
| --------- | -------- | --------------------------------------- |
| `key`     | `string` | The key associated with the queue item. |
| `item`    | `T`      | The item to be stored in the queue.     |

#### Returns

`Promise`\<`void`\>

A promise that resolves when the item has been set.

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`setQueueItem`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#setqueueitem)
