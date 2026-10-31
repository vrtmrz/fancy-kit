[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [refiner](../README.md) / RefinerSync

# Class: RefinerSync\<T, U\>

Defined in: packages/octagonal-wheels/src/dataobject/Refiner.ts:213

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |
| `U`            |

## Constructors

### Constructor

```ts
new RefinerSync<T, U>(__namedParameters: RefinerSyncOptions<T, U>): RefinerSync<T, U>;
```

Defined in: packages/octagonal-wheels/src/dataobject/Refiner.ts:220

#### Parameters

| Parameter           | Type                                                                |
| ------------------- | ------------------------------------------------------------------- |
| `__namedParameters` | [`RefinerSyncOptions`](../RefinerSyncOptions/README.md)\<`T`, `U`\> |

#### Returns

`RefinerSync`\<`T`, `U`\>

## Properties

| Property                                    | Type                                                                     | Defined in                                              |
| ------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| <a id="_buffedresult"></a> `_buffedResult?` | `Error` \| `U`                                                           | packages/octagonal-wheels/src/dataobject/Refiner.ts:215 |
| <a id="_cachedby"></a> `_cachedBy?`         | `T`                                                                      | packages/octagonal-wheels/src/dataobject/Refiner.ts:214 |
| <a id="_evaluation"></a> `_evaluation`      | (`source`: `T`, `previous?`: `U`) => `U`                                 | packages/octagonal-wheels/src/dataobject/Refiner.ts:216 |
| <a id="_shouldupdate"></a> `_shouldUpdate`  | (`isDifferent`: `boolean`, `source`: `T`, `previous?`: `U`) => `boolean` | packages/octagonal-wheels/src/dataobject/Refiner.ts:217 |

## Accessors

### value

#### Get Signature

```ts
get value(): U | undefined;
```

Defined in: packages/octagonal-wheels/src/dataobject/Refiner.ts:249

##### Returns

`U` \| `undefined`

## Methods

### \_isDifferent()

```ts
_isDifferent(a: T, b: T): boolean;
```

Defined in: packages/octagonal-wheels/src/dataobject/Refiner.ts:218

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `a`       | `T`  |
| `b`       | `T`  |

#### Returns

`boolean`

---

### \_startEvaluation()

```ts
_startEvaluation(source: T): void;
```

Defined in: packages/octagonal-wheels/src/dataobject/Refiner.ts:228

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `source`  | `T`  |

#### Returns

`void`

---

### update()

```ts
update(source: T): RefinerSync<T, U>;
```

Defined in: packages/octagonal-wheels/src/dataobject/Refiner.ts:240

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `source`  | `T`  |

#### Returns

`RefinerSync`\<`T`, `U`\>
