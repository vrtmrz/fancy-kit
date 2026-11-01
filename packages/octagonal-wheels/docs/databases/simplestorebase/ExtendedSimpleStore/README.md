[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [databases](../../README.md) / [simplestorebase](../README.md) / ExtendedSimpleStore

# Abstract Class: ExtendedSimpleStore\<T, TBackend\>

Defined in: packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:145

Represents a base class for a simple key-value-store.

## Extends

- [`SimpleStoreBase`](../SimpleStoreBase/README.md)\<`T`, `TBackend`\>

## Extended by

- [`SimpleStoreIDBv2`](../../SimpleStoreIDBv2/SimpleStoreIDBv2/README.md)

## Type Parameters

| Type Parameter | Default type | Description                                 |
| -------------- | ------------ | ------------------------------------------- |
| `T`            | -            | The type of the values stored in the store. |
| `TBackend`     | `any`        | -                                           |

## Implements

- [`SimpleStoreCRUDSupportTransaction`](../SimpleStoreCRUDSupportTransaction/README.md)\<`T`\>

## Constructors

### Constructor

```ts
new ExtendedSimpleStore<T, TBackend>(): ExtendedSimpleStore<T, TBackend>;
```

#### Returns

`ExtendedSimpleStore`\<`T`, `TBackend`\>

#### Inherited from

[`SimpleStoreBase`](../SimpleStoreBase/README.md).[`constructor`](../SimpleStoreBase/README.md#constructor)

## Properties

| Property                                           | Modifier | Type                                                                                    | Description                                                                         | Defined in                                                     |
| -------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| <a id="deletedatabase"></a> `deleteDatabase`       | `static` | (`instanceName`: `string`) => `Promise`\<`void`\>                                       | Deletes the database associated with the specified instance name.                   | packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:174 |
| <a id="getactiveinstance"></a> `getActiveInstance` | `static` | \<`T`\>(`instanceName`: `string`) => `ExtendedSimpleStore`\<`T`, `any`\> \| `undefined` | Gets an active SimpleStore instance by its instance name.                           | packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:161 |
| <a id="hasactiveinstance"></a> `hasActiveInstance` | `static` | (`instanceName`: `string`) => `boolean`                                                 | Checks if there is an active SimpleStore instance with the specified instance name. | packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:167 |
| <a id="open"></a> `open`                           | `static` | \<`T`\>(`name`: `string`, `instanceName?`: `string`) => `ExtendedSimpleStore`\<`T`\>    | Opens a SimpleStore instance.                                                       | packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:155 |

## Accessors

### db

#### Get Signature

```ts
get abstract db(): Promise<TBackend> | undefined;
```

Defined in: packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:98

Gets the underlying database instance.

##### Returns

`Promise`\<`TBackend`\> \| `undefined`

A Promise that resolves to the database instance, or undefined if not available.

#### Inherited from

[`SimpleStoreBase`](../SimpleStoreBase/README.md).[`db`](../SimpleStoreBase/README.md#db)

## Methods

### beginTransaction()

```ts
abstract beginTransaction(callback: (tx: SimpleStoreTransaction<T>) => void): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:181

Begins a transaction and provides a callback with the transaction object.

#### Parameters

| Parameter  | Type                                                                                     | Description                                                 |
| ---------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `callback` | (`tx`: [`SimpleStoreTransaction`](../SimpleStoreTransaction/README.md)\<`T`\>) => `void` | The callback function that receives the transaction object. |

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the transaction is completed.

#### Implementation of

```ts
SimpleStoreCRUDSupportTransaction.beginTransaction;
```

---

### clear()

```ts
abstract clear(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:134

Clears all entries in the store.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`SimpleStoreBase`](../SimpleStoreBase/README.md).[`clear`](../SimpleStoreBase/README.md#clear)

---

### close()

```ts
abstract close(): void;
```

Defined in: packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:138

Closes the store.

#### Returns

`void`

#### Inherited from

[`SimpleStoreBase`](../SimpleStoreBase/README.md).[`close`](../SimpleStoreBase/README.md#close)

---

### delete()

```ts
abstract delete(key: string): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:115

Deletes the value associated with the specified key.

#### Parameters

| Parameter | Type     | Description                      |
| --------- | -------- | -------------------------------- |
| `key`     | `string` | The key to delete the value for. |

#### Returns

`Promise`\<`void`\>

#### Implementation of

```ts
SimpleStoreCRUDSupportTransaction.delete;
```

#### Inherited from

[`SimpleStoreBase`](../SimpleStoreBase/README.md).[`delete`](../SimpleStoreBase/README.md#delete)

---

### destroy()

```ts
abstract destroy(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:142

Destroys the store and releases all resources.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`SimpleStoreBase`](../SimpleStoreBase/README.md).[`destroy`](../SimpleStoreBase/README.md#destroy)

---

### get()

```ts
abstract get(key: string): Promise<T | undefined>;
```

Defined in: packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:104

Retrieves the value associated with the specified key.

#### Parameters

| Parameter | Type     | Description                        |
| --------- | -------- | ---------------------------------- |
| `key`     | `string` | The key to retrieve the value for. |

#### Returns

`Promise`\<`T` \| `undefined`\>

#### Implementation of

```ts
SimpleStoreCRUDSupportTransaction.get;
```

#### Inherited from

[`SimpleStoreBase`](../SimpleStoreBase/README.md).[`get`](../SimpleStoreBase/README.md#get)

---

### keys()

```ts
abstract keys(
   from?: string,
   to?: string,
count?: number): Promise<string[]>;
```

Defined in: packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:122

Retrieves an array of keys within the specified range.

#### Parameters

| Parameter | Type     | Description                                                                                    |
| --------- | -------- | ---------------------------------------------------------------------------------------------- |
| `from?`   | `string` | The starting key (inclusive) of the range. If undefined, starts from the first key.            |
| `to?`     | `string` | The ending key (inclusive) of the range. If undefined, ends at the last key.                   |
| `count?`  | `number` | The maximum number of keys to retrieve. If not specified, retrieves all keys within the range. |

#### Returns

`Promise`\<`string`[]\>

#### Implementation of

```ts
SimpleStoreCRUDSupportTransaction.keys;
```

#### Inherited from

[`SimpleStoreBase`](../SimpleStoreBase/README.md).[`keys`](../SimpleStoreBase/README.md#keys)

---

### keysIDB()

```ts
abstract keysIDB(query?: IDBValidKey | IDBKeyRange, count?: number): Promise<IDBValidKey[]>;
```

Defined in: packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:129

Retrieves an array of IndexedDB keys within the specified range.

#### Parameters

| Parameter | Type                           | Description                                                                                    |
| --------- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `query?`  | `IDBValidKey` \| `IDBKeyRange` | The key or key range to query.                                                                 |
| `count?`  | `number`                       | The maximum number of keys to retrieve. If not specified, retrieves all keys within the range. |

#### Returns

`Promise`\<`IDBValidKey`[]\>

#### Inherited from

[`SimpleStoreBase`](../SimpleStoreBase/README.md).[`keysIDB`](../SimpleStoreBase/README.md#keysidb)

---

### set()

```ts
abstract set(key: string, value: T): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:110

Sets the value associated with the specified key.

#### Parameters

| Parameter | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| `key`     | `string` | The key to set the value for. |
| `value`   | `T`      | The value to be set.          |

#### Returns

`Promise`\<`void`\>

#### Implementation of

```ts
SimpleStoreCRUDSupportTransaction.set;
```

#### Inherited from

[`SimpleStoreBase`](../SimpleStoreBase/README.md).[`set`](../SimpleStoreBase/README.md#set)
