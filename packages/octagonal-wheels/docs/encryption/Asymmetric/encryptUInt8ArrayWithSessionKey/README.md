[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / encryptUInt8ArrayWithSessionKey

# Function: encryptUInt8ArrayWithSessionKey()

```ts
function encryptUInt8ArrayWithSessionKey(
   data: ArrayBuffer | Uint8Array<ArrayBuffer>, 
   aesKey: CryptoKey, 
iv: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer>;
```

Defined in: [src/encryption/asymmetric/asymmetric.ts:61](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/asymmetric.ts#L61)

Encrypts a Uint8Array using a session key (AES-GCM).
AES-GCM provides authenticated encryption (AEAD).

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | `ArrayBuffer` \| `Uint8Array`\<`ArrayBuffer`\> | The data to be encrypted |
| `aesKey` | `CryptoKey` | The AES key to use for encryption |
| `iv` | `Uint8Array`\<`ArrayBuffer`\> | The initialisation vector (IV) for encryption |

## Returns

`Promise`\<`ArrayBuffer`\>

The encrypted data as an ArrayBuffer (includes authentication tag)
