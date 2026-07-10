[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [databases](../../README.md) / [simplestorebase](../README.md) / SimpleStoreBase

# Abstract Class: SimpleStoreBase\<T, TBackend\>

Defined in: [src/databases/SimpleStoreBase.ts:93](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L93)

Represents a base class for a simple key-value-store.

## Extended by

- [`ExtendedSimpleStore`](../ExtendedSimpleStore/README.md)
- [`SimpleStoreIDBv1`](../../SimpleStoreIDBv1/SimpleStoreIDBv1/README.md)

## Type Parameters

| Type Parameter | Default type | Description |
| ------ | ------ | ------ |
| `T` | - | The type of the values stored in the store. |
| `TBackend` | `any` | - |

## Implements

- [`SimpleStore`](../SimpleStore/README.md)\<`T`, `TBackend`\>

## Constructors

### Constructor

```ts
new SimpleStoreBase<T, TBackend>(): SimpleStoreBase<T, TBackend>;
```

#### Returns

`SimpleStoreBase`\<`T`, `TBackend`\>

## Accessors

### db

#### Get Signature

```ts
get abstract db(): undefined | Promise<TBackend>;
```

Defined in: [src/databases/SimpleStoreBase.ts:98](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L98)

Gets the underlying database instance.

##### Returns

`undefined` \| `Promise`\<`TBackend`\>

A Promise that resolves to the database instance, or undefined if not available.

#### Implementation of

[`SimpleStore`](../SimpleStore/README.md).[`db`](../SimpleStore/README.md#db)

## Methods

### clear()

```ts
abstract clear(): Promise<void>;
```

Defined in: [src/databases/SimpleStoreBase.ts:134](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L134)

Clears all entries in the store.

#### Returns

`Promise`\<`void`\>

***

### close()

```ts
abstract close(): void;
```

Defined in: [src/databases/SimpleStoreBase.ts:138](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L138)

Closes the store.

#### Returns

`void`

***

### delete()

```ts
abstract delete(key: string): Promise<void>;
```

Defined in: [src/databases/SimpleStoreBase.ts:115](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L115)

Deletes the value associated with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key to delete the value for. |

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`SimpleStore`](../SimpleStore/README.md).[`delete`](../SimpleStore/README.md#delete)

***

### destroy()

```ts
abstract destroy(): Promise<void>;
```

Defined in: [src/databases/SimpleStoreBase.ts:142](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L142)

Destroys the store and releases all resources.

#### Returns

`Promise`\<`void`\>

***

### get()

```ts
abstract get(key: string): Promise<undefined | T>;
```

Defined in: [src/databases/SimpleStoreBase.ts:104](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L104)

Retrieves the value associated with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key to retrieve the value for. |

#### Returns

`Promise`\<`undefined` \| `T`\>

#### Implementation of

[`SimpleStore`](../SimpleStore/README.md).[`get`](../SimpleStore/README.md#get)

***

### keys()

```ts
abstract keys(
   from?: string, 
   to?: string, 
count?: number): Promise<string[]>;
```

Defined in: [src/databases/SimpleStoreBase.ts:122](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L122)

Retrieves an array of keys within the specified range.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `from?` | `string` | The starting key (inclusive) of the range. If undefined, starts from the first key. |
| `to?` | `string` | The ending key (inclusive) of the range. If undefined, ends at the last key. |
| `count?` | `number` | The maximum number of keys to retrieve. If not specified, retrieves all keys within the range. |

#### Returns

`Promise`\<`string`[]\>

#### Implementation of

[`SimpleStore`](../SimpleStore/README.md).[`keys`](../SimpleStore/README.md#keys)

***

### keysIDB()

```ts
abstract keysIDB(query?: IDBValidKey | IDBKeyRange, count?: number): Promise<IDBValidKey[]>;
```

Defined in: [src/databases/SimpleStoreBase.ts:129](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L129)

Retrieves an array of IndexedDB keys within the specified range.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `query?` | `IDBValidKey` \| `IDBKeyRange` | The key or key range to query. |
| `count?` | `number` | The maximum number of keys to retrieve. If not specified, retrieves all keys within the range. |

#### Returns

`Promise`\<`IDBValidKey`[]\>

***

### set()

```ts
abstract set(key: string, value: T): Promise<void>;
```

Defined in: [src/databases/SimpleStoreBase.ts:110](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L110)

Sets the value associated with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key to set the value for. |
| `value` | `T` | The value to be set. |

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`SimpleStore`](../SimpleStore/README.md).[`set`](../SimpleStore/README.md#set)
