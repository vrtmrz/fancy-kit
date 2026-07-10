[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / generateIV

# Function: generateIV()

```ts
function generateIV(length: number): Uint8Array<ArrayBuffer>;
```

Defined in: [src/encryption/asymmetric/keys.ts:192](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/keys.ts#L192)

Generates an initialisation vector (IV) of the specified length.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `length` | `number` | `AES_GCM_IV_LENGTH` | The IV length in bytes (default: 12). |

## Returns

`Uint8Array`\<`ArrayBuffer`\>

The generated IV.

## Throws

Error if the length is not positive.
