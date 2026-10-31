[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [iterable](../../README.md) / [source](../README.md) / GeneratorSource

# Class: GeneratorSource\<T\>

Defined in: packages/octagonal-wheels/src/iterable/source.ts:75

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Constructors

### Constructor

```ts
new GeneratorSource<T>(onSizeUpdated?: (size: number) => void): GeneratorSource<T>;
```

Defined in: packages/octagonal-wheels/src/iterable/source.ts:93

#### Parameters

| Parameter        | Type                         |
| ---------------- | ---------------------------- |
| `onSizeUpdated?` | (`size`: `number`) => `void` |

#### Returns

`GeneratorSource`\<`T`\>

## Properties

| Property                                      | Type                                                                                                                                                                                                                                      | Defined in                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| <a id="_current"></a> `_current`              | \{ `promise`: `Promise`\<_typeof_ `GENERATOR_CLOSED` \| `T`\>; `reject`: (`reason?`: `any`) => `void`; `resolve`: (`value`: \| _typeof_ `GENERATOR_CLOSED` \| `T` \| `PromiseLike`\<_typeof_ `GENERATOR_CLOSED` \| `T`\>) => `void`; \}   | packages/octagonal-wheels/src/iterable/source.ts:77 |
| `_current.promise`                            | `Promise`\<_typeof_ `GENERATOR_CLOSED` \| `T`\>                                                                                                                                                                                           | packages/octagonal-wheels/src/promises.ts:67        |
| `_current.reject`                             | (`reason?`: `any`) => `void`                                                                                                                                                                                                              | packages/octagonal-wheels/src/promises.ts:67        |
| `_current.resolve`                            | (`value`: \| _typeof_ `GENERATOR_CLOSED` \| `T` \| `PromiseLike`\<_typeof_ `GENERATOR_CLOSED` \| `T`\>) => `void`                                                                                                                         | packages/octagonal-wheels/src/promises.ts:67        |
| <a id="_next"></a> `_next`                    | \{ `promise`: `Promise`\<_typeof_ `GENERATOR_CLOSED` \| `T`\>; `reject`: (`reason?`: `any`) => `void`; `resolve`: (`value`: \| _typeof_ `GENERATOR_CLOSED` \| `T` \| `PromiseLike`\<_typeof_ `GENERATOR_CLOSED` \| `T`\>) => `void`; \}[] | packages/octagonal-wheels/src/iterable/source.ts:76 |
| <a id="_onsizeupdated"></a> `_onSizeUpdated?` | (`size`: `number`) => `void`                                                                                                                                                                                                              | packages/octagonal-wheels/src/iterable/source.ts:78 |
| <a id="closed"></a> `closed`                  | `boolean`                                                                                                                                                                                                                                 | packages/octagonal-wheels/src/iterable/source.ts:91 |
| <a id="finished"></a> `finished`              | `boolean`                                                                                                                                                                                                                                 | packages/octagonal-wheels/src/iterable/source.ts:92 |

## Accessors

### size

#### Get Signature

```ts
get size(): number;
```

Defined in: packages/octagonal-wheels/src/iterable/source.ts:88

##### Returns

`number`

## Methods

### \_updateSize()

```ts
_updateSize(): void;
```

Defined in: packages/octagonal-wheels/src/iterable/source.ts:79

#### Returns

`void`

---

### \[asyncIterator\]()

```ts
asyncIterator: AsyncGenerator<Awaited<T>, void, unknown>;
```

Defined in: packages/octagonal-wheels/src/iterable/source.ts:120

#### Returns

`AsyncGenerator`\<`Awaited`\<`T`\>, `void`, `unknown`\>

---

### \[dispose\]()

```ts
dispose: void;
```

Defined in: packages/octagonal-wheels/src/iterable/source.ts:123

#### Returns

`void`

---

### dispose()

```ts
dispose(): void;
```

Defined in: packages/octagonal-wheels/src/iterable/source.ts:111

#### Returns

`void`

---

### enqueue()

```ts
enqueue(item: T): void;
```

Defined in: packages/octagonal-wheels/src/iterable/source.ts:100

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `item`    | `T`  |

#### Returns

`void`

---

### finish()

```ts
finish(): void;
```

Defined in: packages/octagonal-wheels/src/iterable/source.ts:116

#### Returns

`void`

---

### values()

```ts
values(): AsyncGenerator<Awaited<T>, void, unknown>;
```

Defined in: packages/octagonal-wheels/src/iterable/source.ts:127

#### Returns

`AsyncGenerator`\<`Awaited`\<`T`\>, `void`, `unknown`\>
