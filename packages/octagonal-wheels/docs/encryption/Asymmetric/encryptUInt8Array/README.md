[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / encryptUInt8Array

# Function: encryptUInt8Array()

```ts
function encryptUInt8Array(data: Uint8Array<ArrayBuffer>, publicKey: CryptoKey): Promise<Uint8Array<ArrayBuffer>>;
```

Defined in: [src/encryption/asymmetric/asymmetric.ts:98](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/asymmetric.ts#L98)

Encrypts a Uint8Array using a hybrid method of RSA-OAEP and AES-GCM.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | `Uint8Array`\<`ArrayBuffer`\> | The data to be encrypted |
| `publicKey` | `CryptoKey` | The RSA public key to use for encryption |

## Returns

`Promise`\<`Uint8Array`\<`ArrayBuffer`\>\>

The encrypted data as a Uint8Array
