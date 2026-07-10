[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [BackedQueue](../../README.md) / [QueueBackendTypes](../README.md) / QueueBackendWithTransaction

# Interface: QueueBackendWithTransaction\<T\>

Defined in: [src/BackedQueue/QueueBackendTypes.ts:106](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackendTypes.ts#L106)

Represents a backend store with transaction support for managing queue items.

## Extends

- [`QueueBackendBase`](../QueueBackendBase/README.md)\<`T`\>

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

| Property | Modifier | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="prefix"></a> `prefix` | `readonly` | `string` | A prefix used for queue items. This prefix should not be included in processingPrefix. | [`QueueBackendBase`](../QueueBackendBase/README.md).[`prefix`](../QueueBackendBase/README.md#prefix) | [src/BackedQueue/QueueBackendTypes.ts:89](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackendTypes.ts#L89) |
| <a id="processingprefix"></a> `processingPrefix` | `readonly` | `string` | A prefix used for processing items. This prefix should not be included in prefix. | [`QueueBackendBase`](../QueueBackendBase/README.md).[`processingPrefix`](../QueueBackendBase/README.md#processingprefix) | [src/BackedQueue/QueueBackendTypes.ts:95](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackendTypes.ts#L95) |

## Methods

### atomic()

```ts
atomic<U>(callback: (store: QueueBackendTransaction<T>) => Promise<U>): Promise<U>;
```

Defined in: [src/BackedQueue/QueueBackendTypes.ts:115](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackendTypes.ts#L115)

Performs the callback within a transaction.

#### Type Parameters

| Type Parameter |
| ------ |
| `U` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `callback` | (`store`: [`QueueBackendTransaction`](../QueueBackendTransaction/README.md)\<`T`\>) => `Promise`\<`U`\> | The function to be performed within the transaction. |

#### Returns

`Promise`\<`U`\>

A promise that resolves to the callback result.
Most backends support transactions confined to a single microtask or a short chain limited to database operations.
Yielding control (for example, awaiting non-storage work or timers) risks inconsistent or partially applied data.
Keep transactional logic brief and focused on storage operations.

***

### deleteProcessingItem()

```ts
deleteProcessingItem(key: string): Promise<void>;
```

Defined in: [src/BackedQueue/QueueBackendTypes.ts:59](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackendTypes.ts#L59)

Deletes a processing item associated with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key associated with the processing item to be deleted. |

#### Returns

`Promise`\<`void`\>

A promise that resolves when the item has been deleted.

#### Inherited from

[`QueueBackendBase`](../QueueBackendBase/README.md).[`deleteProcessingItem`](../QueueBackendBase/README.md#deleteprocessingitem)

***

### deleteQueueItem()

```ts
deleteQueueItem(key: string): Promise<void>;
```

Defined in: [src/BackedQueue/QueueBackendTypes.ts:34](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackendTypes.ts#L34)

Deletes a queued item associated with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key associated with the queued item to be deleted. |

#### Returns

`Promise`\<`void`\>

A promise that resolves when the item has been deleted.

#### Inherited from

[`QueueBackendBase`](../QueueBackendBase/README.md).[`deleteQueueItem`](../QueueBackendBase/README.md#deletequeueitem)

***

### getNextQueueKey()

```ts
getNextQueueKey(): Promise<undefined | string>;
```

Defined in: [src/BackedQueue/QueueBackendTypes.ts:76](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackendTypes.ts#L76)

Retrieves the next available queue key.

#### Returns

`Promise`\<`undefined` \| `string`\>

A promise that resolves to the next queue key, or undefined if none is available.

#### Inherited from

[`QueueBackendBase`](../QueueBackendBase/README.md).[`getNextQueueKey`](../QueueBackendBase/README.md#getnextqueuekey)

***

### getProcessingItem()

```ts
getProcessingItem(key: string): Promise<undefined | T>;
```

Defined in: [src/BackedQueue/QueueBackendTypes.ts:51](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackendTypes.ts#L51)

Retrieves a processing item associated with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key associated with the processing item. |

#### Returns

`Promise`\<`undefined` \| `T`\>

A promise that resolves to the processing item, or undefined if not found.

#### Inherited from

[`QueueBackendBase`](../QueueBackendBase/README.md).[`getProcessingItem`](../QueueBackendBase/README.md#getprocessingitem)

***

### getQueuedItem()

```ts
getQueuedItem(key: string): Promise<undefined | T>;
```

Defined in: [src/BackedQueue/QueueBackendTypes.ts:26](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackendTypes.ts#L26)

Retrieves a queued item associated with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key associated with the queued item. |

#### Returns

`Promise`\<`undefined` \| `T`\>

A promise that resolves to the queued item, or undefined if not found.

#### Inherited from

[`QueueBackendBase`](../QueueBackendBase/README.md).[`getQueuedItem`](../QueueBackendBase/README.md#getqueueditem)

***

### issueNewQueueKey()

```ts
issueNewQueueKey(): string;
```

Defined in: [src/BackedQueue/QueueBackendTypes.ts:83](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackendTypes.ts#L83)

Issues a new queue key.

#### Returns

`string`

The newly issued queue key.

#### Inherited from

[`QueueBackendBase`](../QueueBackendBase/README.md).[`issueNewQueueKey`](../QueueBackendBase/README.md#issuenewqueuekey)

***

### keys()

```ts
keys(
   from: undefined | string, 
   to: undefined | string, 
count?: number): Promise<string[]>;
```

Defined in: [src/BackedQueue/QueueBackendTypes.ts:69](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackendTypes.ts#L69)

Retrieves keys within the specified range, optionally limiting the number of results.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `from` | `undefined` \| `string` | The starting key (inclusive). |
| `to` | `undefined` \| `string` | The ending key (inclusive). |
| `count?` | `number` | The maximum number of keys to retrieve. |

#### Returns

`Promise`\<`string`[]\>

A promise that resolves to an array of keys.

#### Inherited from

[`QueueBackendBase`](../QueueBackendBase/README.md).[`keys`](../QueueBackendBase/README.md#keys)

***

### setProcessingItem()

```ts
setProcessingItem(key: string, item: T): Promise<void>;
```

Defined in: [src/BackedQueue/QueueBackendTypes.ts:43](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackendTypes.ts#L43)

Sets an item as a processing item associated with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key associated with the processing item. |
| `item` | `T` | The item to be set as processing. |

#### Returns

`Promise`\<`void`\>

A promise that resolves when the item has been set.

#### Inherited from

[`QueueBackendBase`](../QueueBackendBase/README.md).[`setProcessingItem`](../QueueBackendBase/README.md#setprocessingitem)

***

### setQueueItem()

```ts
setQueueItem(key: string, item: T): Promise<void>;
```

Defined in: [src/BackedQueue/QueueBackendTypes.ts:18](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackendTypes.ts#L18)

Sets an item in the queue associated with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key associated with the queue item. |
| `item` | `T` | The item to be stored in the queue. |

#### Returns

`Promise`\<`void`\>

A promise that resolves when the item has been set.

#### Inherited from

[`QueueBackendBase`](../QueueBackendBase/README.md).[`setQueueItem`](../QueueBackendBase/README.md#setqueueitem)
