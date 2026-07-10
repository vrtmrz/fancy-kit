[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / decryptConfig

# Function: decryptConfig()

```ts
function decryptConfig(encryptedInfo: Uint8Array, privateKey: CryptoKey): Promise<object>;
```

Defined in: [src/encryption/asymmetric/asymmetricHelper.ts:40](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/asymmetricHelper.ts#L40)

Decrypts configuration data that was encrypted using the hybrid method of RSA-OAEP and AES-GCM.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `encryptedInfo` | `Uint8Array` | The encrypted data (Uint8Array). |
| `privateKey` | `CryptoKey` | The private key to use for decryption. |

## Returns

`Promise`\<`object`\>

The decrypted configuration data (JSON object).

## Throws

Error if decryption fails or if JSON parsing fails.
