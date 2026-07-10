[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [memory](../../README.md) / [memutil](../README.md) / Trench

# Class: Trench

Defined in: [src/memory/memutil.ts:48](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L48)

Represents a Trench, which is a memory utility class for managing data storage.

## Constructors

### Constructor

```ts
new Trench(db: SimpleStore<any>, flushExistItems: boolean): Trench;
```

Defined in: [src/memory/memutil.ts:56](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L56)

Constructs a new instance of the Trench class.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `db` | [`SimpleStore`](../../../databases/simplestorebase/SimpleStore/README.md)\<`any`\> | `undefined` | The SimpleStore instance used for storing data. |
| `flushExistItems` | `boolean` | `true` | Determines whether to flush existing items from the database. |

#### Returns

`Trench`

## Properties

| Property | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="_db"></a> `_db` | [`SimpleStore`](../../../databases/simplestorebase/SimpleStore/README.md)\<`any`\> | `undefined` | [src/memory/memutil.ts:49](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L49) |
| <a id="_flushtask"></a> `_flushTask` | `undefined` \| `Promise`\<`void`\> | `undefined` | [src/memory/memutil.ts:50](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L50) |
| <a id="concealing"></a> `concealing` | `Map`\<`string`, `any`\> | `undefined` | [src/memory/memutil.ts:99](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L99) |

## Methods

### \_dequeue()

```ts
_dequeue<T>(type: string, key: string): Promise<undefined | T>;
```

Defined in: [src/memory/memutil.ts:196](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L196)

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `string` |
| `key` | `string` |

#### Returns

`Promise`\<`undefined` \| `T`\>

***

### \_dequeueWithCommit()

```ts
_dequeueWithCommit<T>(type: string, key: string): CommittableDequeuedValue<T>;
```

Defined in: [src/memory/memutil.ts:202](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L202)

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `string` |
| `key` | `string` |

#### Returns

`CommittableDequeuedValue`\<`T`\>

***

### \_evacuate()

```ts
_evacuate<T>(storeTask: Promise<void>, key: string): Evacuated<T>;
```

Defined in: [src/memory/memutil.ts:148](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L148)

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `storeTask` | `Promise`\<`void`\> |
| `key` | `string` |

#### Returns

[`Evacuated`](../Evacuated/README.md)\<`T`\>

***

### \_queue()

```ts
_queue<T>(
   type: string, 
   key: string, 
   obj: T, 
index: undefined | number): Promise<void>;
```

Defined in: [src/memory/memutil.ts:186](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L186)

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `string` |
| `key` | `string` |
| `obj` | `T` |
| `index` | `undefined` \| `number` |

#### Returns

`Promise`\<`void`\>

***

### bury()

```ts
bury(key: string): Promise<void>;
```

Defined in: [src/memory/memutil.ts:124](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L124)

Dispose concealed object.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key to bury. |

#### Returns

`Promise`\<`void`\>

***

### conceal()

```ts
conceal<T>(obj: T): string;
```

Defined in: [src/memory/memutil.ts:106](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L106)

Conceals an object by generating a unique key and storing the object in SimpleStore.
The object can later be retrieved using the generated key.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `obj` | `T` | The object to be concealed. |

#### Returns

`string`

The generated key used to retrieve the concealed object.

***

### dequeue()

```ts
dequeue<T>(key: string): Promise<undefined | T>;
```

Defined in: [src/memory/memutil.ts:247](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L247)

Removes and returns the first element from the queue associated with the specified key.

#### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of elements in the queue. |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key associated with the queue. |

#### Returns

`Promise`\<`undefined` \| `T`\>

The first element from the queue, or undefined if the queue is empty.

***

### dequeuePermanent()

```ts
dequeuePermanent<T>(key: string): Promise<undefined | T>;
```

Defined in: [src/memory/memutil.ts:280](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L280)

Dequeues an permanent item from the SimpleStore with the specified key.

#### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of the item to dequeue. |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key of the item to dequeue. |

#### Returns

`Promise`\<`undefined` \| `T`\>

The dequeued item.

***

### dequeuePermanentWithCommit()

```ts
dequeuePermanentWithCommit<T>(key: string): CommittableDequeuedValue<T>;
```

Defined in: [src/memory/memutil.ts:290](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L290)

Dequeues an permanent item from the SimpleStore. we can commit or cancel the dequeue operation.

#### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of the item being dequeued. |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key of the item to dequeue. |

#### Returns

`CommittableDequeuedValue`\<`T`\>

The dequeued item.

***

### dequeueWithCommit()

```ts
dequeueWithCommit<T>(key: string): CommittableDequeuedValue<T>;
```

Defined in: [src/memory/memutil.ts:257](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L257)

Dequeues an item. you can commit or cancel the dequeue operation.

#### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of the item being dequeued. |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key of the item to dequeue. |

#### Returns

`CommittableDequeuedValue`\<`T`\>

The dequeued item.

***

### eraseAllEphemerals()

```ts
eraseAllEphemerals(): Promise<void>;
```

Defined in: [src/memory/memutil.ts:75](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L75)

Deletes all ephemeral keys from the SimpleStore.

#### Returns

`Promise`\<`void`\>

A promise that resolves when all ephemeral keys are deleted.

***

### eraseAllPermanences()

```ts
eraseAllPermanences(): Promise<void>;
```

Defined in: [src/memory/memutil.ts:89](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L89)

Deletes all permanences from the SimpleStore.

#### Returns

`Promise`\<`void`\>

A promise that resolves when all permanences are deleted.

***

### evacuate()

```ts
evacuate<T>(obj: T): Evacuated<T>;
```

Defined in: [src/memory/memutil.ts:180](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L180)

Evacuates an object by storing it in the database and returning an `Evacuated` object.
If the object is a Promise, it is first evacuated using the `evacuatePromise` method.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `obj` | `T` | The object to be evacuated. |

#### Returns

[`Evacuated`](../Evacuated/README.md)\<`T`\>

An `Evacuated` object representing the evacuated object.

***

### evacuatePromise()

```ts
evacuatePromise<T>(task: Promise<T>): Evacuated<T>;
```

Defined in: [src/memory/memutil.ts:166](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L166)

Evacuates a promise by storing its resolved value in the database and returning an `Evacuated` object.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `task` | `Promise`\<`T`\> | The promise to be evacuated. |

#### Returns

[`Evacuated`](../Evacuated/README.md)\<`T`\>

An `Evacuated` object representing the evacuated promise.

***

### expose()

```ts
expose<T>(key: string): Promise<undefined | T>;
```

Defined in: [src/memory/memutil.ts:138](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L138)

Exposes a concealed object by its key.
The object is removed from the database after being exposed.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key of the concealed object. |

#### Returns

`Promise`\<`undefined` \| `T`\>

The exposed object.

***

### queue()

```ts
queue<T>(
   key: string, 
   obj: T, 
index?: number): Promise<void>;
```

Defined in: [src/memory/memutil.ts:237](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L237)

Queues an object with the specified key and optional index.

#### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of the object being queued. |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key to associate with the object. |
| `obj` | `T` | The object to be queued. |
| `index?` | `number` | The optional index at which to insert the object in the queue. |

#### Returns

`Promise`\<`void`\>

A promise that resolves when the object is queued.

***

### queuePermanent()

```ts
queuePermanent<T>(
   key: string, 
   obj: T, 
index?: number): Promise<void>;
```

Defined in: [src/memory/memutil.ts:270](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memutil.ts#L270)

Queues an object permanently in the SimpleStore.

#### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of the object being queued. |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key to associate with the object. |
| `obj` | `T` | The object to be queued. |
| `index?` | `number` | Optional. The index at which to insert the object in the queue. |

#### Returns

`Promise`\<`void`\>

The updated queue.
