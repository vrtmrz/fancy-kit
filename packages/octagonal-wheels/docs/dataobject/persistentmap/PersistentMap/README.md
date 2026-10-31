[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [persistentmap](../README.md) / PersistentMap

# Class: PersistentMap\<T\>

Defined in: packages/octagonal-wheels/src/dataobject/PersistentMap.ts:15

Represents a persistent map that stores key-value pairs in the browser's local storage.
The map is automatically saved to the local storage whenever a change is made with some delays.

## Type Parameters

| Type Parameter | Description                           |
| -------------- | ------------------------------------- |
| `T`            | The type of values stored in the map. |

## Constructors

### Constructor

```ts
new PersistentMap<T>(key: string, entries?: readonly readonly [string, T][]): PersistentMap<T>;
```

Defined in: packages/octagonal-wheels/src/dataobject/PersistentMap.ts:72

#### Parameters

| Parameter  | Type                                  |
| ---------- | ------------------------------------- |
| `key`      | `string`                              |
| `entries?` | readonly readonly \[`string`, `T`\][] |

#### Returns

`PersistentMap`\<`T`\>

## Properties

| Property                           | Type                   | Default value           | Defined in                                                   |
| ---------------------------------- | ---------------------- | ----------------------- | ------------------------------------------------------------ |
| <a id="_key"></a> `_key`           | `string`               | `undefined`             | packages/octagonal-wheels/src/dataobject/PersistentMap.ts:18 |
| <a id="_map"></a> `_map`           | `Map`\<`string`, `T`\> | `undefined`             | packages/octagonal-wheels/src/dataobject/PersistentMap.ts:17 |
| <a id="_setcount"></a> `_setCount` | `number`               | `YieldOperationNumbers` | packages/octagonal-wheels/src/dataobject/PersistentMap.ts:16 |

## Methods

### \_load()

```ts
_load(suppliedEntries?: readonly readonly [string, T][]): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/dataobject/PersistentMap.ts:26

#### Parameters

| Parameter         | Type                                  | Default value |
| ----------------- | ------------------------------------- | ------------- |
| `suppliedEntries` | readonly readonly \[`string`, `T`\][] | `[]`          |

#### Returns

`Promise`\<`void`\>

---

### \_queueSave()

```ts
_queueSave(): void;
```

Defined in: packages/octagonal-wheels/src/dataobject/PersistentMap.ts:39

#### Returns

`void`

---

### \_save()

```ts
_save(): void;
```

Defined in: packages/octagonal-wheels/src/dataobject/PersistentMap.ts:23

#### Returns

`void`

---

### clear()

```ts
clear(): void;
```

Defined in: packages/octagonal-wheels/src/dataobject/PersistentMap.ts:63

#### Returns

`void`

---

### delete()

```ts
delete(key: string): boolean;
```

Defined in: packages/octagonal-wheels/src/dataobject/PersistentMap.ts:49

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `key`     | `string` |

#### Returns

`boolean`

---

### flush()

```ts
flush(): void;
```

Defined in: packages/octagonal-wheels/src/dataobject/PersistentMap.ts:20

#### Returns

`void`

---

### get()

```ts
get(key: string, defValue?: T): T | undefined;
```

Defined in: packages/octagonal-wheels/src/dataobject/PersistentMap.ts:67

#### Parameters

| Parameter   | Type     |
| ----------- | -------- |
| `key`       | `string` |
| `defValue?` | `T`      |

#### Returns

`T` \| `undefined`

---

### has()

```ts
has(key: string): boolean;
```

Defined in: packages/octagonal-wheels/src/dataobject/PersistentMap.ts:54

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `key`     | `string` |

#### Returns

`boolean`

---

### set()

```ts
set(key: string, value: T): this;
```

Defined in: packages/octagonal-wheels/src/dataobject/PersistentMap.ts:57

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `key`     | `string` |
| `value`   | `T`      |

#### Returns

`this`
