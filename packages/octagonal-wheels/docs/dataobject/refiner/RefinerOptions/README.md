[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [refiner](../README.md) / RefinerOptions

# Interface: RefinerOptions\<T, U\>

Defined in: [src/dataobject/Refiner.ts:7](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Refiner.ts#L7)

RefinerOptions interface defines the options for the Refiner class.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
| `U` |

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="evaluation"></a> `evaluation` | (`source`: `T`, `previous?`: `U`) => `U` \| `Promise`\<`U`\> | The function to evaluate the source and return a result. It can be synchronous or asynchronous. | [src/dataobject/Refiner.ts:15](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Refiner.ts#L15) |
| <a id="initialsource"></a> `initialSource?` | `T` | The initial source value to start with. | [src/dataobject/Refiner.ts:19](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Refiner.ts#L19) |
| <a id="isdifferent"></a> `isDifferent?` | (`a`: `T`, `b`: `T`) => `boolean` | A function to determine if two sources are different. **See** isObjectDifferent | [src/dataobject/Refiner.ts:36](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Refiner.ts#L36) |
| <a id="shouldupdate"></a> `shouldUpdate?` | (`isDifferent`: `boolean`, `source`: `T`, `previous?`: `U`) => `boolean` | A function to determine if the result should be updated based on the source and previous result. | [src/dataobject/Refiner.ts:27](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Refiner.ts#L27) |
