[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [databases](../../README.md) / [simplestorebase](../README.md) / SimpleStore

# Interface: SimpleStore\<T, TBackend\>

Defined in: [src/databases/SimpleStoreBase.ts:55](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L55)

Represents a simple key-value store.

## Extends

- [`SimpleStoreCRUD`](../SimpleStoreCRUD/README.md)\<`T`\>

## Type Parameters

| Type Parameter | Default type | Description |
| ------ | ------ | ------ |
| `T` | - | The type of values stored in the store. |
| `TBackend` | `any` | - |

## Accessors

### db

#### Get Signature

```ts
get db(): undefined | Promise<TBackend>;
```

Defined in: [src/databases/SimpleStoreBase.ts:56](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L56)

##### Returns

`undefined` \| `Promise`\<`TBackend`\>

## Methods

### delete()

```ts
delete(key: string): Promise<void>;
```

Defined in: [src/databases/SimpleStoreBase.ts:77](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L77)

Deletes the value associated with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key to delete the value for. |

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the value is successfully deleted.

#### Overrides

[`SimpleStoreCRUD`](../SimpleStoreCRUD/README.md).[`delete`](../SimpleStoreCRUD/README.md#delete)

***

### get()

```ts
get(key: string): Promise<undefined | T>;
```

Defined in: [src/databases/SimpleStoreBase.ts:62](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L62)

Retrieves the value associated with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key to retrieve the value for. |

#### Returns

`Promise`\<`undefined` \| `T`\>

A Promise that resolves to the value associated with the key, or undefined if the key does not exist.

#### Overrides

[`SimpleStoreCRUD`](../SimpleStoreCRUD/README.md).[`get`](../SimpleStoreCRUD/README.md#get)

***

### keys()

```ts
keys(
   from: undefined | string, 
   to: undefined | string, 
count?: number): Promise<string[]>;
```

Defined in: [src/databases/SimpleStoreBase.ts:86](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L86)

Retrieves an array of keys within the specified range.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `from` | `undefined` \| `string` | The starting key (inclusive) of the range. If undefined, starts from the first key. |
| `to` | `undefined` \| `string` | The ending key (inclusive) of the range. If undefined, ends at the last key. |
| `count?` | `number` | The maximum number of keys to retrieve. If not specified, retrieves all keys within the range. |

#### Returns

`Promise`\<`string`[]\>

A Promise that resolves to an array of keys within the specified range.

#### Overrides

[`SimpleStoreCRUD`](../SimpleStoreCRUD/README.md).[`keys`](../SimpleStoreCRUD/README.md#keys)

***

### set()

```ts
set(key: string, value: T): Promise<void>;
```

Defined in: [src/databases/SimpleStoreBase.ts:70](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L70)

Sets the value associated with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key to set the value for. |
| `value` | `T` | The value to be set. |

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the value is successfully set.

#### Overrides

[`SimpleStoreCRUD`](../SimpleStoreCRUD/README.md).[`set`](../SimpleStoreCRUD/README.md#set)
