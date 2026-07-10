[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [refiner](../README.md) / RefinerSyncOptions

# Interface: RefinerSyncOptions\<T, U\>

Defined in: [src/dataobject/Refiner.ts:206](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Refiner.ts#L206)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
| `U` |

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="evaluation"></a> `evaluation` | (`source`: `T`, `previous?`: `U`) => `U` | [src/dataobject/Refiner.ts:207](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Refiner.ts#L207) |
| <a id="initialsource"></a> `initialSource?` | `T` | [src/dataobject/Refiner.ts:208](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Refiner.ts#L208) |
| <a id="isdifferent"></a> `isDifferent?` | (`a`: `T`, `b`: `T`) => `boolean` | [src/dataobject/Refiner.ts:210](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Refiner.ts#L210) |
| <a id="shouldupdate"></a> `shouldUpdate?` | (`isDifferent`: `boolean`, `source`: `T`, `previous?`: `U`) => `boolean` | [src/dataobject/Refiner.ts:209](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Refiner.ts#L209) |
