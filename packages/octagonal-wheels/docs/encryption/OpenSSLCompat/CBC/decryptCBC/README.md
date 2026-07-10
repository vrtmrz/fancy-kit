[**octagonal-wheels**](../../../../README.md)

***

[octagonal-wheels](../../../../modules.md) / [encryption](../../../README.md) / [OpenSSLCompat](../../README.md) / [CBC](../README.md) / decryptCBC

# Function: decryptCBC()

```ts
function decryptCBC(
   encryptedData: Uint8Array, 
   passphrase: string, 
iterations: number): Promise<Uint8Array<ArrayBuffer>>;
```

Defined in: [src/encryption/openSSLCompat/CBC.ts:115](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/openSSLCompat/CBC.ts#L115)

Decrypts ciphertext using a password and a specified number of iterations.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `encryptedData` | `Uint8Array` | `undefined` | The encrypted data to decrypt. |
| `passphrase` | `string` | `undefined` | The password to use for decryption. |
| `iterations` | `number` | `100_000` | The number of iterations for key derivation. |

## Returns

`Promise`\<`Uint8Array`\<`ArrayBuffer`\>\>

The decrypted plaintext.
