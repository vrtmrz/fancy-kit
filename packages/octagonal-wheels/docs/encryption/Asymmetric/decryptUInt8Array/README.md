[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / decryptUInt8Array

# Function: decryptUInt8Array()

```ts
function decryptUInt8Array(encryptedInfo: Uint8Array, privateKey: CryptoKey): Promise<Uint8Array<ArrayBuffer>>;
```

Defined in: [src/encryption/asymmetric/asymmetric.ts:174](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/asymmetric.ts#L174)

Decrypts data encrypted with the hybrid method of RSA-OAEP and AES-GCM.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `encryptedInfo` | `Uint8Array` | The encrypted data (Uint8Array) |
| `privateKey` | `CryptoKey` | The RSA private key to use for decryption |

## Returns

`Promise`\<`Uint8Array`\<`ArrayBuffer`\>\>

The decrypted data (Uint8Array)
