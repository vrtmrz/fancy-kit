[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [memory](../../README.md) / [lrucache](../README.md) / LRUCache

# Class: LRUCache\<K, V\>

Defined in: [src/memory/LRUCache.ts:8](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/LRUCache.ts#L8)

Represents a Least Recently Used (LRU) Cache.

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `K` | The type of the cache keys. |
| `V` | The type of the cache values. |

## Constructors

### Constructor

```ts
new LRUCache<K, V>(
   maxCache: number, 
   maxCacheLength: number, 
forwardOnly: boolean): LRUCache<K, V>;
```

Defined in: [src/memory/LRUCache.ts:22](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/LRUCache.ts#L22)

Creates a new instance of the LRUCache class.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `maxCache` | `number` | `undefined` | The maximum number of items to cache. |
| `maxCacheLength` | `number` | `undefined` | The maximum length of the cached values. |
| `forwardOnly` | `boolean` | `false` | True if we only need to cache forward values. |

#### Returns

`LRUCache`\<`K`, `V`\>

## Properties

| Property | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="cachedlength"></a> `cachedLength` | `number` | `0` | [src/memory/LRUCache.ts:13](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/LRUCache.ts#L13) |
| <a id="enablereversed"></a> `enableReversed` | `boolean` | `true` | [src/memory/LRUCache.ts:14](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/LRUCache.ts#L14) |
| <a id="maxcache"></a> `maxCache` | `number` | `200` | [src/memory/LRUCache.ts:11](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/LRUCache.ts#L11) |
| <a id="maxcachedlength"></a> `maxCachedLength` | `number` | `50000000` | [src/memory/LRUCache.ts:12](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/LRUCache.ts#L12) |

## Methods

### clear()

```ts
clear(): void;
```

Defined in: [src/memory/LRUCache.ts:32](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/LRUCache.ts#L32)

Clears the cache.

#### Returns

`void`

***

### get()

```ts
get(key: K): undefined | V;
```

Defined in: [src/memory/LRUCache.ts:52](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/LRUCache.ts#L52)

Gets the value associated with the specified key from the cache.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `K` | The key to retrieve the value for. |

#### Returns

`undefined` \| `V`

The value associated with the key, or undefined if the key is not found.

#### Remarks

After calling this method, the key will be updated to recently used.

***

### has()

```ts
has(key: K): boolean;
```

Defined in: [src/memory/LRUCache.ts:42](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/LRUCache.ts#L42)

Checks if the cache contains the specified key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `K` | The key to check. |

#### Returns

`boolean`

A boolean indicating whether the cache contains the key.

***

### revGet()

```ts
revGet(value: V): undefined | K;
```

Defined in: [src/memory/LRUCache.ts:73](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/LRUCache.ts#L73)

Gets the key associated with the specified value from the cache.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `value` | `V` | The value to retrieve the key for. |

#### Returns

`undefined` \| `K`

The key associated with the value, or undefined if the value is not found.

#### Remarks

After calling this method, the key will be updated to recently used.

***

### set()

```ts
set(key: K, value: V): void;
```

Defined in: [src/memory/LRUCache.ts:90](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/LRUCache.ts#L90)

Sets the value associated with the specified key in the cache.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `K` | The key to set the value for. |
| `value` | `V` | The value to set. |

#### Returns

`void`
