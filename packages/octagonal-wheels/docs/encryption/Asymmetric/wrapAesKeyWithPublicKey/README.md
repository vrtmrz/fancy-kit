[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / wrapAesKeyWithPublicKey

# Function: wrapAesKeyWithPublicKey()

```ts
function wrapAesKeyWithPublicKey(
  aesKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<ArrayBuffer>;
```

Defined in: packages/octagonal-wheels/src/encryption/asymmetric/asymmetric.ts:85

Wraps (encrypts) an AES key using an RSA public key.

## Parameters

| Parameter   | Type        | Description                            |
| ----------- | ----------- | -------------------------------------- |
| `aesKey`    | `CryptoKey` | The AES key to wrap                    |
| `publicKey` | `CryptoKey` | The RSA public key to use for wrapping |

## Returns

`Promise`\<`ArrayBuffer`\>

The wrapped AES key as an ArrayBuffer
