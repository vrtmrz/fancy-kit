[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [refiner](../README.md) / RefinerOptions

# Interface: RefinerOptions\<T, U\>

Defined in: packages/octagonal-wheels/src/dataobject/Refiner.ts:7

RefinerOptions interface defines the options for the Refiner class.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |
| `U`            |

## Properties

| Property                                    | Type                                                                     | Description                                                                                      | Defined in                                             |
| ------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| <a id="evaluation"></a> `evaluation`        | (`source`: `T`, `previous?`: `U`) => `U` \| `Promise`\<`U`\>             | The function to evaluate the source and return a result. It can be synchronous or asynchronous.  | packages/octagonal-wheels/src/dataobject/Refiner.ts:15 |
| <a id="initialsource"></a> `initialSource?` | `T`                                                                      | The initial source value to start with.                                                          | packages/octagonal-wheels/src/dataobject/Refiner.ts:19 |
| <a id="isdifferent"></a> `isDifferent?`     | (`a`: `T`, `b`: `T`) => `boolean`                                        | A function to determine if two sources are different. **See** isObjectDifferent                  | packages/octagonal-wheels/src/dataobject/Refiner.ts:36 |
| <a id="shouldupdate"></a> `shouldUpdate?`   | (`isDifferent`: `boolean`, `source`: `T`, `previous?`: `U`) => `boolean` | A function to determine if the result should be updated based on the source and previous result. | packages/octagonal-wheels/src/dataobject/Refiner.ts:27 |
