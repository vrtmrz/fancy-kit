[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [memory](../../README.md) / [VolatileValueCache](../README.md) / VolatileValueCache

# Class: VolatileValueCache\<K, V\>

Defined in: packages/octagonal-wheels/src/memory/VolatileValueCache.ts:26

A cache that holds its values weakly, allowing them to be garbage-collected
if they are not referenced elsewhere. Keys are standard strings or numbers.

This is useful for caching large objects that should be automatically evicted
from memory when they are no longer in use.

To safely access a value, use `getPin()` which returns a "Pin". A Pin holds a
strong reference to the value, preventing it from being garbage-collected
while you are using it. You MUST call `pin.release()` when you are done
to allow garbage collection to occur.

## Type Parameters

| Type Parameter                     |
| ---------------------------------- |
| `K` _extends_ `string` \| `number` |
| `V`                                |

## Constructors

### Constructor

```ts
new VolatileValueCache<K, V>(): VolatileValueCache<K, V>;
```

Defined in: packages/octagonal-wheels/src/memory/VolatileValueCache.ts:47

#### Returns

`VolatileValueCache`\<`K`, `V`\>

## Methods

### \_delete()

```ts
_delete(keyObject: object): void;
```

Defined in: packages/octagonal-wheels/src/memory/VolatileValueCache.ts:117

#### Parameters

| Parameter   | Type     |
| ----------- | -------- |
| `keyObject` | `object` |

#### Returns

`void`

---

### \_getPin()

```ts
_getPin(valueObject: ValueWrapper<V>): Pin<V>;
```

Defined in: packages/octagonal-wheels/src/memory/VolatileValueCache.ts:31

#### Parameters

| Parameter     | Type                                               |
| ------------- | -------------------------------------------------- |
| `valueObject` | [`ValueWrapper`](../ValueWrapper/README.md)\<`V`\> |

#### Returns

[`Pin`](../Pin/README.md)\<`V`\>

---

### delete()

```ts
delete(key: K): boolean;
```

Defined in: packages/octagonal-wheels/src/memory/VolatileValueCache.ts:109

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `key`     | `K`  |

#### Returns

`boolean`

---

### get()

```ts
get(key: K): V | undefined;
```

Defined in: packages/octagonal-wheels/src/memory/VolatileValueCache.ts:90

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `key`     | `K`  |

#### Returns

`V` \| `undefined`

---

### getPin()

```ts
getPin(key: K): Pin<V> | undefined;
```

Defined in: packages/octagonal-wheels/src/memory/VolatileValueCache.ts:76

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `key`     | `K`  |

#### Returns

[`Pin`](../Pin/README.md)\<`V`\> \| `undefined`

---

### has()

```ts
has(key: K): boolean;
```

Defined in: packages/octagonal-wheels/src/memory/VolatileValueCache.ts:95

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `key`     | `K`  |

#### Returns

`boolean`

---

### set()

```ts
set(key: K, value: V): Pin<V>;
```

Defined in: packages/octagonal-wheels/src/memory/VolatileValueCache.ts:63

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `key`     | `K`  |
| `value`   | `V`  |

#### Returns

[`Pin`](../Pin/README.md)\<`V`\>
