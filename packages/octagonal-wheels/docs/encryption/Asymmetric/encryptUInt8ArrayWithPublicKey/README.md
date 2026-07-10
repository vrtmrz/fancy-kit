[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / encryptUInt8ArrayWithPublicKey

# Function: encryptUInt8ArrayWithPublicKey()

```ts
function encryptUInt8ArrayWithPublicKey(
   data: Uint8Array<ArrayBuffer>, 
   recipientPublicKey: CryptoKey, 
expectedCurve: ECDH_CURVES): Promise<Uint8Array<ArrayBuffer>>;
```

Defined in: [src/encryption/asymmetric/asymmetric.ts:219](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/asymmetric.ts#L219)

Encrypts a Uint8Array using ECDH (Elliptic Curve Diffie-Hellman) and AES-GCM.
Generates an ephemeral ECDH key pair, derives a shared secret, and encrypts the data.
The ephemeral public key is included in the output for decryption.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `data` | `Uint8Array`\<`ArrayBuffer`\> | `undefined` | The data to be encrypted |
| `recipientPublicKey` | `CryptoKey` | `undefined` | The recipient's ECDH public key |
| `expectedCurve` | [`ECDH_CURVES`](../ECDH_CURVES/README.md) | `DEFAULT_ECDH_CURVE` | - |

## Returns

`Promise`\<`Uint8Array`\<`ArrayBuffer`\>\>

The encrypted data as a Uint8Array

## Throws

Error if the recipient public key is not ECDH
