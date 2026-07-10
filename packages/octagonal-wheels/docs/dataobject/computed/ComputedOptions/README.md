[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [computed](../README.md) / ComputedOptions

# Interface: ComputedOptions\<T, U\>

Defined in: [src/dataobject/Computed.ts:4](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Computed.ts#L4)

ComputedOptions interface defines the options for the Computed class.

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `any`[] |
| `U` |

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="evaluation"></a> `evaluation` | (...`args`: `T`) => `U` \| `Promise`\<`U`\> | Function to compute the value based on provided arguments. | [src/dataobject/Computed.ts:10](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Computed.ts#L10) |
| <a id="isequal"></a> `isEqual?` | (`a`: `T`, `b`: `T`) => `boolean` | Function to compare two arguments for equality. | [src/dataobject/Computed.ts:27](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Computed.ts#L27) |
| <a id="requiresupdate"></a> `requiresUpdate?` | (`args`: `T`, `previousArgs`: `null` \| `T`, `previousResult`: `null` \| `Error` \| `U`) => `boolean` \| `Promise`\<`boolean`\> | Function to determine if a forced update is needed. | [src/dataobject/Computed.ts:19](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Computed.ts#L19) |
