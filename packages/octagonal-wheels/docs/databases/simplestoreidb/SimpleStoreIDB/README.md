[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [databases](../../README.md) / [simplestoreidb](../README.md) / SimpleStoreIDB

# Class: SimpleStoreIDB\<T\>

Defined in: [src/databases/SimpleStoreIDB.ts:3](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDB.ts#L3)

Represents a simple store using IndexedDB.

## Extends

- [`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md)\<`T`\>

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of the values stored in the store. |

## Constructors

### Constructor

```ts
new SimpleStoreIDB<T>(name: string, instanceName?: string): SimpleStoreIDB<T>;
```

Defined in: [src/databases/SimpleStoreIDB.ts:14](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDB.ts#L14)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `name` | `string` | a name for the database |
| `instanceName?` | `string` | an optional instance name for the database (if not provided, an automatic instance name will be generated) |

#### Returns

`SimpleStoreIDB`\<`T`\>

#### Deprecated

Use SimpleStoreIDB.open instead.

#### Description

Note: Opening multiple instances with the same instance name by the constructor may throw errors.
Use SimpleStoreIDB.open to get a singleton instance instead.

#### Overrides

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`constructor`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#constructor)

## Properties

| Property | Modifier | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="_instancename"></a> `_instanceName` | `public` | `string` | - | [`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`_instanceName`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#_instancename) | [src/databases/SimpleStoreIDBv2.ts:99](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L99) |
| <a id="_name"></a> `_name` | `public` | `string` | - | [`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`_name`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#_name) | [src/databases/SimpleStoreIDBv2.ts:96](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L96) |
| <a id="_activedbs"></a> `_activeDBs` | `static` | `Map`\<`string`, `FallbackWeakRef`\<[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md)\<`any`\>\>\> | Map of active database instances. | [`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`_activeDBs`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#_activedbs) | [src/databases/SimpleStoreIDBv2.ts:31](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L31) |

## Accessors

### db

#### Get Signature

```ts
get db(): undefined | Promise<IDBPDatabase<any>>;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:110](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L110)

Gets the actual IDBDatabase connection.

##### Returns

`undefined` \| `Promise`\<`IDBPDatabase`\<`any`\>\>

A promise that resolves to the IDBDatabase instance.

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`db`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#db)

***

### name

#### Get Signature

```ts
get name(): string;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:92](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L92)

Gets the name of the store.

##### Returns

`string`

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`name`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#name)

## Methods

### abort()

```ts
abort(): void;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:505](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L505)

#### Returns

`void`

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`abort`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#abort)

***

### addEventListener()

#### Call Signature

```ts
addEventListener(
   eventName: "initialised", 
   listener: (ev: SimpleStoreInitialisedEvent) => void, 
   options?: boolean | AddEventListenerOptions): void;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:138](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L138)

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `eventName` | `"initialised"` |
| `listener` | (`ev`: [`SimpleStoreInitialisedEvent`](../../dbcommon/SimpleStoreInitialisedEvent/README.md)) => `void` |
| `options?` | `boolean` \| `AddEventListenerOptions` |

##### Returns

`void`

##### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`addEventListener`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#addeventlistener)

#### Call Signature

```ts
addEventListener(
   eventName: "closed", 
   listener: (ev: SimpleStoreClosedEvent) => void, 
   options?: boolean | AddEventListenerOptions): void;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:143](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L143)

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `eventName` | `"closed"` |
| `listener` | (`ev`: [`SimpleStoreClosedEvent`](../../dbcommon/SimpleStoreClosedEvent/README.md)) => `void` |
| `options?` | `boolean` \| `AddEventListenerOptions` |

##### Returns

`void`

##### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`addEventListener`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#addeventlistener)

#### Call Signature

```ts
addEventListener(
   eventName: "destroyed", 
   listener: (ev: SimpleStoreDestroyedEvent) => void, 
   options?: boolean | AddEventListenerOptions): void;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:148](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L148)

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `eventName` | `"destroyed"` |
| `listener` | (`ev`: [`SimpleStoreDestroyedEvent`](../../dbcommon/SimpleStoreDestroyedEvent/README.md)) => `void` |
| `options?` | `boolean` \| `AddEventListenerOptions` |

##### Returns

`void`

##### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`addEventListener`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#addeventlistener)

#### Call Signature

```ts
addEventListener(
   eventName: "opened", 
   listener: (ev: SimpleStoreOpenedEvent) => void, 
   options?: boolean | AddEventListenerOptions): void;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:153](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L153)

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `eventName` | `"opened"` |
| `listener` | (`ev`: [`SimpleStoreOpenedEvent`](../../dbcommon/SimpleStoreOpenedEvent/README.md)) => `void` |
| `options?` | `boolean` \| `AddEventListenerOptions` |

##### Returns

`void`

##### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`addEventListener`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#addeventlistener)

***

### beginTransaction()

```ts
beginTransaction(callback: (tx: SimpleStoreTransaction<T>) => void | Promise<void>): Promise<void>;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:424](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L424)

Begins a transaction and executes the provided callback within the transaction context.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `callback` | (`tx`: [`SimpleStoreTransaction`](../../simplestorebase/SimpleStoreTransaction/README.md)\<`T`\>) => `void` \| `Promise`\<`void`\> | The callback function to execute within the transaction. |

#### Returns

`Promise`\<`void`\>

A promise that resolves when the transaction is complete.
Note: Nested transactions are not supported.
Transaction will be automatically committed unless aborted before the event loop runs.

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`beginTransaction`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#begintransaction)

***

### clear()

```ts
clear(): Promise<void>;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:379](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L379)

Clears all key-value pairs in the store.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the store is cleared.

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`clear`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#clear)

***

### close()

```ts
close(): void;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:389](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L389)

Closes the database and removes it from active instances.

#### Returns

`void`

void.

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`close`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#close)

***

### commit()

```ts
commit(): void;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:500](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L500)

#### Returns

`void`

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`commit`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#commit)

***

### delete()

```ts
delete(key: string): Promise<void>;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:347](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L347)

Deletes the value associated with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key to delete from the store. |

#### Returns

`Promise`\<`void`\>

A promise that resolves when the operation is complete.

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`delete`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#delete)

***

### destroy()

```ts
destroy(): Promise<void>;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:401](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L401)

Destroys the database and removes all data.
Note: This also closes the database if it is open.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the database is destroyed.

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`destroy`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#destroy)

***

### get()

```ts
get(key: string): Promise<undefined | T>;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:328](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L328)

Retrieves the value associated with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key to retrieve from the store. |

#### Returns

`Promise`\<`undefined` \| `T`\>

A promise that resolves to the value associated with the key, or undefined if not found.

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`get`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#get)

***

### isDestroyed()

```ts
isDestroyed(): boolean;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:245](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L245)

Checks if the database is destroyed.

#### Returns

`boolean`

True if the database is destroyed, false otherwise.

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`isDestroyed`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#isdestroyed)

***

### isNotInitialised()

```ts
isNotInitialised(): boolean;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:237](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L237)

Checks if the database is not initialised.

#### Returns

`boolean`

True if the database is not initialised, false otherwise.

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`isNotInitialised`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#isnotinitialised)

***

### isOpened()

```ts
isOpened(): boolean;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:253](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L253)

Checks if the database is opened.

#### Returns

`boolean`

True if the database is opened, false otherwise.

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`isOpened`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#isopened)

***

### keys()

```ts
keys(
   from?: string, 
   to?: string, 
count?: number): Promise<string[]>;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:358](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L358)

Retrieves an array of keys within the specified range.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `from?` | `string` | The lower bound of the key range. |
| `to?` | `string` | The upper bound of the key range. |
| `count?` | `number` | The maximum number of keys to retrieve. |

#### Returns

`Promise`\<`string`[]\>

A promise that resolves to an array of keys within the specified range.

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`keys`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#keys)

***

### keysIDB()

```ts
keysIDB(query?: IDBValidKey | IDBKeyRange, count?: number): Promise<IDBValidKey[]>;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:369](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L369)

Retrieves an array of keys matching the specified query.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `query?` | `IDBValidKey` \| `IDBKeyRange` | The query to match the keys against. |
| `count?` | `number` | The maximum number of keys to retrieve. |

#### Returns

`Promise`\<`IDBValidKey`[]\>

A promise that resolves to an array of keys matching the query.

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`keysIDB`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#keysidb)

***

### removeEventListener()

```ts
removeEventListener(
   eventName: SimpleStoreEventTypes, 
   listener: (ev: SimpleStoreEvent) => void, 
   options?: boolean | EventListenerOptions): void;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:167](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L167)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `eventName` | [`SimpleStoreEventTypes`](../../dbcommon/SimpleStoreEventTypes/README.md) |
| `listener` | (`ev`: [`SimpleStoreEvent`](../../dbcommon/SimpleStoreEvent/README.md)) => `void` |
| `options?` | `boolean` \| `EventListenerOptions` |

#### Returns

`void`

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`removeEventListener`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#removeeventlistener)

***

### set()

```ts
set(key: string, value: T): Promise<void>;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:338](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L338)

Stores a value with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key to associate with the value. |
| `value` | `T` | The value to store. |

#### Returns

`Promise`\<`void`\>

A promise that resolves when the operation is complete.

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`set`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#set)

***

### deleteDatabase()

```ts
static deleteDatabase(instanceName: string): Promise<void>;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:77](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L77)

Deletes the database with the given instance name.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `instanceName` | `string` | The name of the instance. |

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`deleteDatabase`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#deletedatabase)

***

### getActiveInstance()

```ts
static getActiveInstance<T>(instanceName: string): 
  | undefined
| SimpleStoreIDBv2<T>;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:57](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L57)

Gets the active instance by name.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `instanceName` | `string` | The name of the instance. |

#### Returns

  \| `undefined`
  \| [`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md)\<`T`\>

The active SimpleStoreIDB instance or undefined if not found.

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`getActiveInstance`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#getactiveinstance)

***

### hasActiveInstance()

```ts
static hasActiveInstance(instanceName: string): boolean;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:68](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L68)

Checks if there is an active instance with the given name.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `instanceName` | `string` | The name of the instance. |

#### Returns

`boolean`

True if an active instance exists, false otherwise.

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`hasActiveInstance`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#hasactiveinstance)

***

### open()

```ts
static open<U>(name: string, instanceName?: string): SimpleStoreIDBv2<U>;
```

Defined in: [src/databases/SimpleStoreIDBv2.ts:38](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv2.ts#L38)

Open a SimpleStoreIDB instance.

#### Type Parameters

| Type Parameter |
| ------ |
| `U` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `name` | `string` | The name of the store. |
| `instanceName?` | `string` | - |

#### Returns

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md)\<`U`\>

SimpleStoreIDB<U>.

#### Inherited from

[`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md).[`open`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md#open)
