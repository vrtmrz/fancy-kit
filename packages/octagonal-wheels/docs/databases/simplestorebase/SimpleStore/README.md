[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [databases](../../README.md) / [simplestorebase](../README.md) / SimpleStore

# Interface: SimpleStore\<T, TBackend\>

Defined in: packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:55

Represents a simple key-value store.

## Extends

- [`SimpleStoreCRUD`](../SimpleStoreCRUD/README.md)\<`T`\>

## Type Parameters

| Type Parameter | Default type | Description                             |
| -------------- | ------------ | --------------------------------------- |
| `T`            | -            | The type of values stored in the store. |
| `TBackend`     | `any`        | -                                       |

## Accessors

### db

#### Get Signature

```ts
get db(): Promise<TBackend> | undefined;
```

Defined in: packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:56

##### Returns

`Promise`\<`TBackend`\> \| `undefined`

## Methods

### delete()

```ts
delete(key: string): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:77

Deletes the value associated with the specified key.

#### Parameters

| Parameter | Type     | Description                      |
| --------- | -------- | -------------------------------- |
| `key`     | `string` | The key to delete the value for. |

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the value is successfully deleted.

#### Overrides

```ts
SimpleStoreCRUD.delete;
```

---

### get()

```ts
get(key: string): Promise<T | undefined>;
```

Defined in: packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:62

Retrieves the value associated with the specified key.

#### Parameters

| Parameter | Type     | Description                        |
| --------- | -------- | ---------------------------------- |
| `key`     | `string` | The key to retrieve the value for. |

#### Returns

`Promise`\<`T` \| `undefined`\>

A Promise that resolves to the value associated with the key, or undefined if the key does not exist.

#### Overrides

```ts
SimpleStoreCRUD.get;
```

---

### keys()

```ts
keys(
   from: string | undefined,
   to: string | undefined,
count?: number): Promise<string[]>;
```

Defined in: packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:86

Retrieves an array of keys within the specified range.

#### Parameters

| Parameter | Type                    | Description                                                                                    |
| --------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| `from`    | `string` \| `undefined` | The starting key (inclusive) of the range. If undefined, starts from the first key.            |
| `to`      | `string` \| `undefined` | The ending key (inclusive) of the range. If undefined, ends at the last key.                   |
| `count?`  | `number`                | The maximum number of keys to retrieve. If not specified, retrieves all keys within the range. |

#### Returns

`Promise`\<`string`[]\>

A Promise that resolves to an array of keys within the specified range.

#### Overrides

```ts
SimpleStoreCRUD.keys;
```

---

### set()

```ts
set(key: string, value: T): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:70

Sets the value associated with the specified key.

#### Parameters

| Parameter | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| `key`     | `string` | The key to set the value for. |
| `value`   | `T`      | The value to be set.          |

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the value is successfully set.

#### Overrides

```ts
SimpleStoreCRUD.set;
```
