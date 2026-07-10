[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / decryptUInt8ArrayWithPrivateKey

# Function: decryptUInt8ArrayWithPrivateKey()

```ts
function decryptUInt8ArrayWithPrivateKey(encryptedData: Uint8Array, privateKey: CryptoKey): Promise<Uint8Array<ArrayBufferLike>>;
```

Defined in: [src/encryption/asymmetric/asymmetric.ts:262](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/asymmetric.ts#L262)

Decrypts data encrypted with ECDH and AES-GCM using the private key.
Extracts the ephemeral public key, derives the shared secret, and decrypts the data.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `encryptedData` | `Uint8Array` | The encrypted data as a Uint8Array |
| `privateKey` | `CryptoKey` | The ECDH private key |

## Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

The decrypted data as a Uint8Array

## Throws

Error if the data format is invalid
