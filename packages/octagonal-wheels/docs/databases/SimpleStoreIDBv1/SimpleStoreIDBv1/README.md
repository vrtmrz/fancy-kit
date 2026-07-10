[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [databases](../../README.md) / [SimpleStoreIDBv1](../README.md) / SimpleStoreIDBv1

# Class: SimpleStoreIDBv1\<T\>

Defined in: [src/databases/SimpleStoreIDBv1.ts:11](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv1.ts#L11)

Represents a simple store using IndexedDB.

## Extends

- [`SimpleStoreBase`](../../simplestorebase/SimpleStoreBase/README.md)\<`T`, `IDBPDatabase`\<`any`\>\>

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of the values stored in the store. |

## Constructors

### Constructor

```ts
new SimpleStoreIDBv1<T>(name: string): SimpleStoreIDBv1<T>;
```

Defined in: [src/databases/SimpleStoreIDBv1.ts:13](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv1.ts#L13)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`SimpleStoreIDBv1`\<`T`\>

#### Overrides

[`SimpleStoreBase`](../../simplestorebase/SimpleStoreBase/README.md).[`constructor`](../../simplestorebase/SimpleStoreBase/README.md#constructor)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="_db"></a> `_db?` | `Promise`\<`IDBPDatabase`\<`any`\>\> | [src/databases/SimpleStoreIDBv1.ts:18](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv1.ts#L18) |
| <a id="name"></a> `name` | `string` | [src/databases/SimpleStoreIDBv1.ts:12](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv1.ts#L12) |

## Accessors

### db

#### Get Signature

```ts
get db(): undefined | Promise<IDBPDatabase<any>>;
```

Defined in: [src/databases/SimpleStoreIDBv1.ts:19](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv1.ts#L19)

Gets the underlying database instance.

##### Returns

`undefined` \| `Promise`\<`IDBPDatabase`\<`any`\>\>

A Promise that resolves to the database instance, or undefined if not available.

#### Overrides

[`SimpleStoreBase`](../../simplestorebase/SimpleStoreBase/README.md).[`db`](../../simplestorebase/SimpleStoreBase/README.md#db)

## Methods

### clear()

```ts
clear(): Promise<void>;
```

Defined in: [src/databases/SimpleStoreIDBv1.ts:85](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv1.ts#L85)

Clears all entries in the store.

#### Returns

`Promise`\<`void`\>

#### Overrides

[`SimpleStoreBase`](../../simplestorebase/SimpleStoreBase/README.md).[`clear`](../../simplestorebase/SimpleStoreBase/README.md#clear)

***

### close()

```ts
close(): void;
```

Defined in: [src/databases/SimpleStoreIDBv1.ts:90](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv1.ts#L90)

Closes the store.

#### Returns

`void`

#### Overrides

[`SimpleStoreBase`](../../simplestorebase/SimpleStoreBase/README.md).[`close`](../../simplestorebase/SimpleStoreBase/README.md#close)

***

### delete()

```ts
delete(key: string): Promise<void>;
```

Defined in: [src/databases/SimpleStoreIDBv1.ts:64](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv1.ts#L64)

Deletes the value associated with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key to delete the value for. |

#### Returns

`Promise`\<`void`\>

#### Overrides

[`SimpleStoreBase`](../../simplestorebase/SimpleStoreBase/README.md).[`delete`](../../simplestorebase/SimpleStoreBase/README.md#delete)

***

### destroy()

```ts
destroy(): Promise<void>;
```

Defined in: [src/databases/SimpleStoreIDBv1.ts:98](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv1.ts#L98)

Destroys the store and releases all resources.

#### Returns

`Promise`\<`void`\>

#### Overrides

[`SimpleStoreBase`](../../simplestorebase/SimpleStoreBase/README.md).[`destroy`](../../simplestorebase/SimpleStoreBase/README.md#destroy)

***

### get()

```ts
get(key: string): Promise<undefined | T>;
```

Defined in: [src/databases/SimpleStoreIDBv1.ts:54](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv1.ts#L54)

Retrieves the value associated with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key to retrieve the value for. |

#### Returns

`Promise`\<`undefined` \| `T`\>

#### Overrides

[`SimpleStoreBase`](../../simplestorebase/SimpleStoreBase/README.md).[`get`](../../simplestorebase/SimpleStoreBase/README.md#get)

***

### initDB()

```ts
initDB(name: string): void;
```

Defined in: [src/databases/SimpleStoreIDBv1.ts:23](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv1.ts#L23)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`void`

***

### keys()

```ts
keys(
   from?: string, 
   to?: string, 
count?: number): Promise<string[]>;
```

Defined in: [src/databases/SimpleStoreIDBv1.ts:68](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv1.ts#L68)

Retrieves an array of keys within the specified range.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `from?` | `string` | The starting key (inclusive) of the range. If undefined, starts from the first key. |
| `to?` | `string` | The ending key (inclusive) of the range. If undefined, ends at the last key. |
| `count?` | `number` | The maximum number of keys to retrieve. If not specified, retrieves all keys within the range. |

#### Returns

`Promise`\<`string`[]\>

#### Overrides

[`SimpleStoreBase`](../../simplestorebase/SimpleStoreBase/README.md).[`keys`](../../simplestorebase/SimpleStoreBase/README.md#keys)

***

### keysIDB()

```ts
keysIDB(query?: IDBValidKey | IDBKeyRange, count?: number): Promise<IDBValidKey[]>;
```

Defined in: [src/databases/SimpleStoreIDBv1.ts:80](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv1.ts#L80)

Retrieves an array of IndexedDB keys within the specified range.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `query?` | `IDBValidKey` \| `IDBKeyRange` | The key or key range to query. |
| `count?` | `number` | The maximum number of keys to retrieve. If not specified, retrieves all keys within the range. |

#### Returns

`Promise`\<`IDBValidKey`[]\>

#### Overrides

[`SimpleStoreBase`](../../simplestorebase/SimpleStoreBase/README.md).[`keysIDB`](../../simplestorebase/SimpleStoreBase/README.md#keysidb)

***

### set()

```ts
set(key: string, value: T): Promise<void>;
```

Defined in: [src/databases/SimpleStoreIDBv1.ts:59](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreIDBv1.ts#L59)

Sets the value associated with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key to set the value for. |
| `value` | `T` | The value to be set. |

#### Returns

`Promise`\<`void`\>

#### Overrides

[`SimpleStoreBase`](../../simplestorebase/SimpleStoreBase/README.md).[`set`](../../simplestorebase/SimpleStoreBase/README.md#set)
