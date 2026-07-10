[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [encryption](../README.md) / decryptBinary

# Function: decryptBinary()

```ts
function decryptBinary(
   encryptedResult: Uint8Array, 
   passphrase: string, 
autoCalculateIterations: boolean): Promise<Uint8Array<ArrayBufferLike>>;
```

Defined in: [src/encryption/encryption.ts:404](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/encryption.ts#L404)

Decrypts the encrypted binary data using the provided passphrase.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `encryptedResult` | `Uint8Array` | The encrypted binary data as a Uint8Array. |
| `passphrase` | `string` | The passphrase used for decryption. |
| `autoCalculateIterations` | `boolean` | A boolean indicating whether to automatically calculate the iterations for key derivation. |

## Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

A Promise that resolves to the decrypted binary data as a Uint8Array.

## Throws

If decryption fails or an error occurs during the decryption process.
