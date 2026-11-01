[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [refiner](../README.md) / RefinerSyncOptions

# Interface: RefinerSyncOptions\<T, U\>

Defined in: packages/octagonal-wheels/src/dataobject/Refiner.ts:206

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |
| `U`            |

## Properties

| Property                                    | Type                                                                     | Defined in                                              |
| ------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| <a id="evaluation"></a> `evaluation`        | (`source`: `T`, `previous?`: `U`) => `U`                                 | packages/octagonal-wheels/src/dataobject/Refiner.ts:207 |
| <a id="initialsource"></a> `initialSource?` | `T`                                                                      | packages/octagonal-wheels/src/dataobject/Refiner.ts:208 |
| <a id="isdifferent"></a> `isDifferent?`     | (`a`: `T`, `b`: `T`) => `boolean`                                        | packages/octagonal-wheels/src/dataobject/Refiner.ts:210 |
| <a id="shouldupdate"></a> `shouldUpdate?`   | (`isDifferent`: `boolean`, `source`: `T`, `previous?`: `U`) => `boolean` | packages/octagonal-wheels/src/dataobject/Refiner.ts:209 |
