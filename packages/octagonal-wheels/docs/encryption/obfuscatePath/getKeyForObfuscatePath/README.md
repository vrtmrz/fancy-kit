[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [obfuscatePath](../README.md) / getKeyForObfuscatePath

# Function: getKeyForObfuscatePath()

```ts
function getKeyForObfuscatePath(
   passphrase: string, 
   dataBuf: Uint8Array, 
autoCalculateIterations: boolean): Promise<[CryptoKey, Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>]>;
```

Defined in: [src/encryption/obfuscatePath.ts:43](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/obfuscatePath.ts#L43)

Generates a key, salt, and IV for obfuscating a path using the provided passphrase.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `passphrase` | `string` | The passphrase used for key generation. |
| `dataBuf` | `Uint8Array` | The data buffer to be used in key derivation. |
| `autoCalculateIterations` | `boolean` | A flag indicating whether to automatically calculate the number of iterations based on the passphrase length. |

## Returns

`Promise`\<\[`CryptoKey`, `Uint8Array`\<`ArrayBuffer`\>, `Uint8Array`\<`ArrayBuffer`\>\]\>

A promise that resolves to an array containing the generated key, salt, and IV.
