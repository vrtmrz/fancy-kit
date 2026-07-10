[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [databases](../../README.md) / [simplestorebase](../README.md) / SimpleStoreCRUD

# Type Alias: SimpleStoreCRUD\<T\>

```ts
type SimpleStoreCRUD<T> = {
  delete: Promise<void>;
  get: Promise<undefined | T>;
  keys: Promise<string[]>;
  set: Promise<void>;
};
```

Defined in: [src/databases/SimpleStoreBase.ts:5](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L5)

Defines the CRUD operations and transaction type for a simple key-value store.

## Extended by

- [`SimpleStore`](../SimpleStore/README.md)

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of the values stored in the store. |

## Methods

### delete()

```ts
delete(key: string): Promise<void>;
```

Defined in: [src/databases/SimpleStoreBase.ts:21](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L21)

Deletes the value associated with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key to delete the value for. |

#### Returns

`Promise`\<`void`\>

***

### get()

```ts
get(key: string): Promise<undefined | T>;
```

Defined in: [src/databases/SimpleStoreBase.ts:10](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L10)

Retrieves the value associated with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key to retrieve the value for. |

#### Returns

`Promise`\<`undefined` \| `T`\>

***

### keys()

```ts
keys(
   from: undefined | string, 
   to: undefined | string, 
count?: number): Promise<string[]>;
```

Defined in: [src/databases/SimpleStoreBase.ts:28](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L28)

Retrieves an array of keys within the specified range.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `from` | `undefined` \| `string` | The starting key (inclusive) of the range. If undefined, starts from the first key. |
| `to` | `undefined` \| `string` | The ending key (inclusive) of the range. If undefined, ends at the last key. |
| `count?` | `number` | The maximum number of keys to retrieve. If not specified, retrieves all keys within the range. |

#### Returns

`Promise`\<`string`[]\>

***

### set()

```ts
set(key: string, value: T): Promise<void>;
```

Defined in: [src/databases/SimpleStoreBase.ts:16](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/SimpleStoreBase.ts#L16)

Sets the value associated with the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key to set the value for. |
| `value` | `T` | The value to be set. |

#### Returns

`Promise`\<`void`\>
