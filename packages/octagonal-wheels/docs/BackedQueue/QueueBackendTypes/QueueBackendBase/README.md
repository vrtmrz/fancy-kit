[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [BackedQueue](../../README.md) / [QueueBackendTypes](../README.md) / QueueBackendBase

# Interface: QueueBackendBase\<T\>

Defined in: [src/BackedQueue/QueueBackendTypes.ts:10](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackendTypes.ts#L10)

Represents a base interface for a backend store that manages queue items.

## Extended by

- [`QueueBackendWithTransaction`](../QueueBackendWithTransaction/README.md)

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of items stored in the queue. |

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="prefix"></a> `prefix` | `readonly` | `string` | A prefix used for queue items. This prefix should not be included in processingPrefix. | [src/BackedQueue/QueueBackendTypes.ts:89](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackendTypes.ts#L89) |
| <a id="processingprefix"></a> `processingPrefix` | `readonly` | `string` | A prefix used for processing items. This prefix should not be included in prefix. | [src/BackedQueue/QueueBackendTypes.ts:95](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/QueueBackendTypes.ts#L95) |

## Methods

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
