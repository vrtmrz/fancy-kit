[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [BackedQueue](../../README.md) / [QueueBackend](../README.md) / QueueBackend

# Class: QueueBackend\<T\>

Defined in: [src/BackedQueue/QueueBackend.ts:14](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L14)

Backend store implemented via prefixed namespacing over a SimpleStore.

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | Type of items stored in the queue. |

## Implements

- [`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md)\<`T`\>

## Constructors

### Constructor

```ts
new QueueBackend<T>(
   db: 
  | SimpleStoreCRUDSupportTransaction<T>
  | SimpleStoreTransaction<T>, 
   name: string, 
   basePrefix: string, 
shouldBypass?: (key: string) => boolean): QueueBackend<T>;
```

Defined in: [src/BackedQueue/QueueBackend.ts:60](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L60)

Constructs a QueueBackend instance.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `db` | \| [`SimpleStoreCRUDSupportTransaction`](../../../databases/simplestorebase/SimpleStoreCRUDSupportTransaction/README.md)\<`T`\> \| [`SimpleStoreTransaction`](../../../databases/simplestorebase/SimpleStoreTransaction/README.md)\<`T`\> | Backend database instance. |
| `name` | `string` | Logical name for this queue namespace. |
| `basePrefix` | `string` | Root prefix applied to all keys. |
| `shouldBypass?` | (`key`: `string`) => `boolean` | Optional predicate to bypass certain keys. |

#### Returns

`QueueBackend`\<`T`\>

## Properties

| Property | Modifier | Type | Default value | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="_backend"></a> `_backend` | `protected` | \| [`SimpleStoreCRUDSupportTransaction`](../../../databases/simplestorebase/SimpleStoreCRUDSupportTransaction/README.md)\<`T`\> \| [`SimpleStoreTransaction`](../../../databases/simplestorebase/SimpleStoreTransaction/README.md)\<`T`\> | `undefined` | Backend store used for transactional operations. Either SimpleStoreCRUDSupportTransaction or SimpleStoreTransaction. | [src/BackedQueue/QueueBackend.ts:20](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L20) |
| <a id="_baseprefix"></a> `_basePrefix` | `readonly` | `string` | `undefined` | Base prefix used to namespace keys. Ensures keys remain distinct and ordered. | [src/BackedQueue/QueueBackend.ts:32](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L32) |
| <a id="_incrementalid"></a> `_incrementalId` | `protected` | `number` | `0` | - | [src/BackedQueue/QueueBackend.ts:178](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L178) |
| <a id="_name"></a> `_name` | `readonly` | `string` | `undefined` | Name of this backend store. | [src/BackedQueue/QueueBackend.ts:25](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L25) |
| <a id="_sessionrandom"></a> `_sessionRandom` | `protected` | `number` | `undefined` | - | [src/BackedQueue/QueueBackend.ts:177](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L177) |
| <a id="_shouldbypasskey"></a> `_shouldBypassKey` | `protected` | (`key`: `string`) => `boolean` | `undefined` | Predicate to decide whether a key is bypassed during queue scanning. | [src/BackedQueue/QueueBackend.ts:51](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L51) |
| <a id="_startuptime"></a> `_startupTime` | `protected` | `number` | `undefined` | - | [src/BackedQueue/QueueBackend.ts:176](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L176) |

## Accessors

### prefix

#### Get Signature

```ts
get prefix(): string;
```

Defined in: [src/BackedQueue/QueueBackend.ts:37](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L37)

Prefix used for queued items.

##### Returns

`string`

A prefix used for queue items.
This prefix should not be included in processingPrefix.

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`prefix`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#prefix)

***

### processingPrefix

#### Get Signature

```ts
get processingPrefix(): string;
```

Defined in: [src/BackedQueue/QueueBackend.ts:43](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L43)

Prefix used for items marked as processing.

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

Defined in: [src/BackedQueue/QueueBackend.ts:123](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L123)

Performs a series of operations atomically inside a transaction.

#### Type Parameters

| Type Parameter |
| ------ |
| `U` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `callback` | (`store`: [`QueueBackendTransaction`](../../QueueBackendTypes/QueueBackendTransaction/README.md)\<`T`\>) => `Promise`\<`U`\> | Function receiving a transactional queue backend. |

#### Returns

`Promise`\<`U`\>

Result returned by the callback.

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`atomic`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#atomic)

***

### deleteProcessingItem()

```ts
deleteProcessingItem(key: string): Promise<void>;
```

Defined in: [src/BackedQueue/QueueBackend.ts:114](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L114)

Removes a processing item by key.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`deleteProcessingItem`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#deleteprocessingitem)

***

### deleteQueueItem()

```ts
deleteQueueItem(key: string): Promise<void>;
```

Defined in: [src/BackedQueue/QueueBackend.ts:92](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L92)

Removes a queued item by key.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`deleteQueueItem`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#deletequeueitem)

***

### getNextQueueKey()

```ts
getNextQueueKey(): Promise<undefined | string>;
```

Defined in: [src/BackedQueue/QueueBackend.ts:156](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L156)

Retrieves the next available queue key (without item mutation).
Skips bypassed keys.

#### Returns

`Promise`\<`undefined` \| `string`\>

Next queue key, or undefined if none.

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`getNextQueueKey`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#getnextqueuekey)

***

### getProcessingItem()

```ts
getProcessingItem(key: string): Promise<undefined | T>;
```

Defined in: [src/BackedQueue/QueueBackend.ts:100](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L100)

Retrieves a processing item by key.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |

#### Returns

`Promise`\<`undefined` \| `T`\>

Promise resolving to the item, or undefined if absent.

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`getProcessingItem`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#getprocessingitem)

***

### getQueuedItem()

```ts
getQueuedItem(key: string): Promise<undefined | T>;
```

Defined in: [src/BackedQueue/QueueBackend.ts:78](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L78)

Retrieves a queued item by key.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |

#### Returns

`Promise`\<`undefined` \| `T`\>

Promise resolving to the item, or undefined if absent.

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`getQueuedItem`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#getqueueditem)

***

### issueNewQueueKey()

```ts
issueNewQueueKey(): string;
```

Defined in: [src/BackedQueue/QueueBackend.ts:183](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L183)

Issues a new unique queue key.

#### Returns

`string`

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`issueNewQueueKey`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#issuenewqueuekey)

***

### keys()

```ts
keys(
   from: undefined | string, 
   to: undefined | string, 
count?: number): Promise<string[]>;
```

Defined in: [src/BackedQueue/QueueBackend.ts:147](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L147)

Retrieves keys in a range.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `from` | `undefined` \| `string` | Inclusive start key (optional). |
| `to` | `undefined` \| `string` | Inclusive end key (optional). |
| `count?` | `number` | Maximum number of keys (optional). |

#### Returns

`Promise`\<`string`[]\>

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`keys`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#keys)

***

### setProcessingItem()

```ts
setProcessingItem(key: string, item: T): Promise<void>;
```

Defined in: [src/BackedQueue/QueueBackend.ts:107](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L107)

Stores a processing item by key.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |
| `item` | `T` |

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`setProcessingItem`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#setprocessingitem)

***

### setQueueItem()

```ts
setQueueItem(key: string, item: T): Promise<void>;
```

Defined in: [src/BackedQueue/QueueBackend.ts:85](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackend.ts#L85)

Stores a queued item by key.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |
| `item` | `T` |

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`QueueBackendWithTransaction`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md).[`setQueueItem`](../../QueueBackendTypes/QueueBackendWithTransaction/README.md#setqueueitem)
