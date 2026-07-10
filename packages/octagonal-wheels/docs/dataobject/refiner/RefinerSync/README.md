[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [refiner](../README.md) / RefinerSync

# Class: RefinerSync\<T, U\>

Defined in: [src/dataobject/Refiner.ts:213](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Refiner.ts#L213)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
| `U` |

## Constructors

### Constructor

```ts
new RefinerSync<T, U>(__namedParameters: RefinerSyncOptions<T, U>): RefinerSync<T, U>;
```

Defined in: [src/dataobject/Refiner.ts:220](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Refiner.ts#L220)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `__namedParameters` | [`RefinerSyncOptions`](../RefinerSyncOptions/README.md)\<`T`, `U`\> |

#### Returns

`RefinerSync`\<`T`, `U`\>

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="_buffedresult"></a> `_buffedResult?` | `Error` \| `U` | [src/dataobject/Refiner.ts:215](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Refiner.ts#L215) |
| <a id="_cachedby"></a> `_cachedBy?` | `T` | [src/dataobject/Refiner.ts:214](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Refiner.ts#L214) |
| <a id="_evaluation"></a> `_evaluation` | (`source`: `T`, `previous?`: `U`) => `U` | [src/dataobject/Refiner.ts:216](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Refiner.ts#L216) |
| <a id="_shouldupdate"></a> `_shouldUpdate` | (`isDifferent`: `boolean`, `source`: `T`, `previous?`: `U`) => `boolean` | [src/dataobject/Refiner.ts:217](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Refiner.ts#L217) |

## Accessors

### value

#### Get Signature

```ts
get value(): undefined | U;
```

Defined in: [src/dataobject/Refiner.ts:249](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Refiner.ts#L249)

##### Returns

`undefined` \| `U`

## Methods

### \_isDifferent()

```ts
_isDifferent(a: T, b: T): boolean;
```

Defined in: [src/dataobject/Refiner.ts:218](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Refiner.ts#L218)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `a` | `T` |
| `b` | `T` |

#### Returns

`boolean`

***

### \_startEvaluation()

```ts
_startEvaluation(source: T): void;
```

Defined in: [src/dataobject/Refiner.ts:228](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Refiner.ts#L228)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `source` | `T` |

#### Returns

`void`

***

### update()

```ts
update(source: T): RefinerSync<T, U>;
```

Defined in: [src/dataobject/Refiner.ts:240](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Refiner.ts#L240)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `source` | `T` |

#### Returns

`RefinerSync`\<`T`, `U`\>
