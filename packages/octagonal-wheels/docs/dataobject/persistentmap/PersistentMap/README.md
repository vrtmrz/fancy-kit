[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [persistentmap](../README.md) / PersistentMap

# Class: PersistentMap\<T\>

Defined in: [src/dataobject/PersistentMap.ts:15](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/PersistentMap.ts#L15)

Represents a persistent map that stores key-value pairs in the browser's local storage.
The map is automatically saved to the local storage whenever a change is made with some delays.

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of values stored in the map. |

## Constructors

### Constructor

```ts
new PersistentMap<T>(key: string, entries?: readonly readonly [string, T][]): PersistentMap<T>;
```

Defined in: [src/dataobject/PersistentMap.ts:72](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/PersistentMap.ts#L72)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |
| `entries?` | readonly readonly \[`string`, `T`\][] |

#### Returns

`PersistentMap`\<`T`\>

## Properties

| Property | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="_key"></a> `_key` | `string` | `undefined` | [src/dataobject/PersistentMap.ts:18](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/PersistentMap.ts#L18) |
| <a id="_map"></a> `_map` | `Map`\<`string`, `T`\> | `undefined` | [src/dataobject/PersistentMap.ts:17](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/PersistentMap.ts#L17) |
| <a id="_setcount"></a> `_setCount` | `number` | `YieldOperationNumbers` | [src/dataobject/PersistentMap.ts:16](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/PersistentMap.ts#L16) |

## Methods

### \_load()

```ts
_load(suppliedEntries: readonly readonly [string, T][]): Promise<void>;
```

Defined in: [src/dataobject/PersistentMap.ts:26](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/PersistentMap.ts#L26)

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `suppliedEntries` | readonly readonly \[`string`, `T`\][] | `[]` |

#### Returns

`Promise`\<`void`\>

***

### \_queueSave()

```ts
_queueSave(): void;
```

Defined in: [src/dataobject/PersistentMap.ts:39](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/PersistentMap.ts#L39)

#### Returns

`void`

***

### \_save()

```ts
_save(): void;
```

Defined in: [src/dataobject/PersistentMap.ts:23](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/PersistentMap.ts#L23)

#### Returns

`void`

***

### clear()

```ts
clear(): void;
```

Defined in: [src/dataobject/PersistentMap.ts:63](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/PersistentMap.ts#L63)

#### Returns

`void`

***

### delete()

```ts
delete(key: string): boolean;
```

Defined in: [src/dataobject/PersistentMap.ts:49](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/PersistentMap.ts#L49)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |

#### Returns

`boolean`

***

### flush()

```ts
flush(): void;
```

Defined in: [src/dataobject/PersistentMap.ts:20](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/PersistentMap.ts#L20)

#### Returns

`void`

***

### get()

```ts
get(key: string, defValue?: T): undefined | T;
```

Defined in: [src/dataobject/PersistentMap.ts:67](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/PersistentMap.ts#L67)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |
| `defValue?` | `T` |

#### Returns

`undefined` \| `T`

***

### has()

```ts
has(key: string): boolean;
```

Defined in: [src/dataobject/PersistentMap.ts:54](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/PersistentMap.ts#L54)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |

#### Returns

`boolean`

***

### set()

```ts
set(key: string, value: T): this;
```

Defined in: [src/dataobject/PersistentMap.ts:57](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/PersistentMap.ts#L57)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |
| `value` | `T` |

#### Returns

`this`
