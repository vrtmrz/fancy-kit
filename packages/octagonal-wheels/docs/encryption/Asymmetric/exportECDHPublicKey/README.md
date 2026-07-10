[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / exportECDHPublicKey

# Function: exportECDHPublicKey()

```ts
function exportECDHPublicKey(publicKey: CryptoKey): Promise<Uint8Array<ArrayBufferLike>>;
```

Defined in: [src/encryption/asymmetric/keys.ts:151](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/keys.ts#L151)

Exports an ECDH public key as a Uint8Array.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `publicKey` | `CryptoKey` | The ECDH public key to export. |

## Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

The exported public key as a Uint8Array.

## Throws

Error if export fails.
