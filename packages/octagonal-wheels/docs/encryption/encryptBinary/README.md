[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [encryption](../README.md) / encryptBinary

# Function: encryptBinary()

```ts
function encryptBinary(
   input: Uint8Array<ArrayBuffer>, 
   passphrase: string, 
autoCalculateIterations: boolean): Promise<Uint8Array<ArrayBuffer>>;
```

Defined in: [src/encryption/encryption.ts:375](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/encryption.ts#L375)

Encrypts binary data using AES-GCM encryption algorithm.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | `Uint8Array`\<`ArrayBuffer`\> | The binary data to be encrypted. |
| `passphrase` | `string` | The passphrase used to derive the encryption key. |
| `autoCalculateIterations` | `boolean` | A boolean indicating whether to automatically calculate the number of iterations for key derivation. |

## Returns

`Promise`\<`Uint8Array`\<`ArrayBuffer`\>\>

The encrypted binary data.
