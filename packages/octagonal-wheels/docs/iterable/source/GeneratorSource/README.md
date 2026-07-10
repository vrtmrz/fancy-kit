[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [iterable](../../README.md) / [source](../README.md) / GeneratorSource

# Class: GeneratorSource\<T\>

Defined in: [src/iterable/source.ts:75](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/iterable/source.ts#L75)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Constructors

### Constructor

```ts
new GeneratorSource<T>(onSizeUpdated?: (size: number) => void): GeneratorSource<T>;
```

Defined in: [src/iterable/source.ts:93](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/iterable/source.ts#L93)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `onSizeUpdated?` | (`size`: `number`) => `void` |

#### Returns

`GeneratorSource`\<`T`\>

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="_current"></a> `_current` | \{ `promise`: `Promise`\<*typeof* `GENERATOR_CLOSED` \| `T`\>; `reject`: (`reason?`: `any`) => `void`; `resolve`: (`value`: \| *typeof* `GENERATOR_CLOSED` \| `T` \| `PromiseLike`\<*typeof* `GENERATOR_CLOSED` \| `T`\>) => `void`; \} | [src/iterable/source.ts:77](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/iterable/source.ts#L77) |
| `_current.promise` | `Promise`\<*typeof* `GENERATOR_CLOSED` \| `T`\> | [src/promises.ts:67](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L67) |
| `_current.reject` | (`reason?`: `any`) => `void` | [src/promises.ts:67](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L67) |
| `_current.resolve` | (`value`: \| *typeof* `GENERATOR_CLOSED` \| `T` \| `PromiseLike`\<*typeof* `GENERATOR_CLOSED` \| `T`\>) => `void` | [src/promises.ts:67](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L67) |
| <a id="_next"></a> `_next` | \{ `promise`: `Promise`\<*typeof* `GENERATOR_CLOSED` \| `T`\>; `reject`: (`reason?`: `any`) => `void`; `resolve`: (`value`: \| *typeof* `GENERATOR_CLOSED` \| `T` \| `PromiseLike`\<*typeof* `GENERATOR_CLOSED` \| `T`\>) => `void`; \}[] | [src/iterable/source.ts:76](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/iterable/source.ts#L76) |
| <a id="_onsizeupdated"></a> `_onSizeUpdated?` | (`size`: `number`) => `void` | [src/iterable/source.ts:78](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/iterable/source.ts#L78) |
| <a id="closed"></a> `closed` | `boolean` | [src/iterable/source.ts:91](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/iterable/source.ts#L91) |
| <a id="finished"></a> `finished` | `boolean` | [src/iterable/source.ts:92](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/iterable/source.ts#L92) |

## Accessors

### size

#### Get Signature

```ts
get size(): number;
```

Defined in: [src/iterable/source.ts:88](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/iterable/source.ts#L88)

##### Returns

`number`

## Methods

### \_updateSize()

```ts
_updateSize(): void;
```

Defined in: [src/iterable/source.ts:79](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/iterable/source.ts#L79)

#### Returns

`void`

***

### \[asyncIterator\]()

```ts
asyncIterator: AsyncGenerator<Awaited<T>, void, unknown>;
```

Defined in: [src/iterable/source.ts:120](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/iterable/source.ts#L120)

#### Returns

`AsyncGenerator`\<`Awaited`\<`T`\>, `void`, `unknown`\>

***

### \[dispose\]()

```ts
dispose: void;
```

Defined in: [src/iterable/source.ts:123](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/iterable/source.ts#L123)

#### Returns

`void`

***

### dispose()

```ts
dispose(): void;
```

Defined in: [src/iterable/source.ts:111](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/iterable/source.ts#L111)

#### Returns

`void`

***

### enqueue()

```ts
enqueue(item: T): void;
```

Defined in: [src/iterable/source.ts:100](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/iterable/source.ts#L100)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `item` | `T` |

#### Returns

`void`

***

### finish()

```ts
finish(): void;
```

Defined in: [src/iterable/source.ts:116](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/iterable/source.ts#L116)

#### Returns

`void`

***

### values()

```ts
values(): AsyncGenerator<Awaited<T>, void, unknown>;
```

Defined in: [src/iterable/source.ts:127](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/iterable/source.ts#L127)

#### Returns

`AsyncGenerator`\<`Awaited`\<`T`\>, `void`, `unknown`\>
