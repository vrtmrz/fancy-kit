[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [computed](../README.md) / ComputedOptions

# Interface: ComputedOptions\<T, U\>

Defined in: packages/octagonal-wheels/src/dataobject/Computed.ts:4

ComputedOptions interface defines the options for the Computed class.

## Type Parameters

| Type Parameter        |
| --------------------- |
| `T` _extends_ `any`[] |
| `U`                   |

## Properties

| Property                                      | Type                                                                                                                            | Description                                                | Defined in                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| <a id="evaluation"></a> `evaluation`          | (...`args`: `T`) => `U` \| `Promise`\<`U`\>                                                                                     | Function to compute the value based on provided arguments. | packages/octagonal-wheels/src/dataobject/Computed.ts:10 |
| <a id="isequal"></a> `isEqual?`               | (`a`: `T`, `b`: `T`) => `boolean`                                                                                               | Function to compare two arguments for equality.            | packages/octagonal-wheels/src/dataobject/Computed.ts:27 |
| <a id="requiresupdate"></a> `requiresUpdate?` | (`args`: `T`, `previousArgs`: `T` \| `null`, `previousResult`: `Error` \| `U` \| `null`) => `boolean` \| `Promise`\<`boolean`\> | Function to determine if a forced update is needed.        | packages/octagonal-wheels/src/dataobject/Computed.ts:19 |
