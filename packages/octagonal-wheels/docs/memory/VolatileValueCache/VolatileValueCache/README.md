[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [memory](../../README.md) / [VolatileValueCache](../README.md) / VolatileValueCache

# Class: VolatileValueCache\<K, V\>

Defined in: [src/memory/VolatileValueCache.ts:26](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/VolatileValueCache.ts#L26)

A cache that holds its values weakly, allowing them to be garbage-collected
if they are not referenced elsewhere. Keys are standard strings or numbers.

This is useful for caching large objects that should be automatically evicted
from memory when they are no longer in use.

To safely access a value, use `getPin()` which returns a "Pin". A Pin holds a
strong reference to the value, preventing it from being garbage-collected
while you are using it. You MUST call `pin.release()` when you are done
to allow garbage collection to occur.

## Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* `string` \| `number` |
| `V` |

## Constructors

### Constructor

```ts
new VolatileValueCache<K, V>(): VolatileValueCache<K, V>;
```

Defined in: [src/memory/VolatileValueCache.ts:47](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/VolatileValueCache.ts#L47)

#### Returns

`VolatileValueCache`\<`K`, `V`\>

## Methods

### \_delete()

```ts
_delete(keyObject: object): void;
```

Defined in: [src/memory/VolatileValueCache.ts:117](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/VolatileValueCache.ts#L117)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `keyObject` | `object` |

#### Returns

`void`

***

### \_getPin()

```ts
_getPin(valueObject: ValueWrapper<V>): Pin<V>;
```

Defined in: [src/memory/VolatileValueCache.ts:31](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/VolatileValueCache.ts#L31)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `valueObject` | [`ValueWrapper`](../ValueWrapper/README.md)\<`V`\> |

#### Returns

[`Pin`](../Pin/README.md)\<`V`\>

***

### delete()

```ts
delete(key: K): boolean;
```

Defined in: [src/memory/VolatileValueCache.ts:109](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/VolatileValueCache.ts#L109)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `K` |

#### Returns

`boolean`

***

### get()

```ts
get(key: K): undefined | V;
```

Defined in: [src/memory/VolatileValueCache.ts:90](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/VolatileValueCache.ts#L90)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `K` |

#### Returns

`undefined` \| `V`

***

### getPin()

```ts
getPin(key: K): undefined | Pin<V>;
```

Defined in: [src/memory/VolatileValueCache.ts:76](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/VolatileValueCache.ts#L76)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `K` |

#### Returns

`undefined` \| [`Pin`](../Pin/README.md)\<`V`\>

***

### has()

```ts
has(key: K): boolean;
```

Defined in: [src/memory/VolatileValueCache.ts:95](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/VolatileValueCache.ts#L95)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `K` |

#### Returns

`boolean`

***

### set()

```ts
set(key: K, value: V): Pin<V>;
```

Defined in: [src/memory/VolatileValueCache.ts:63](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/VolatileValueCache.ts#L63)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `K` |
| `value` | `V` |

#### Returns

[`Pin`](../Pin/README.md)\<`V`\>
