[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / generateSharedSecretKey

# Function: generateSharedSecretKey()

```ts
function generateSharedSecretKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<CryptoKey>;
```

Defined in: packages/octagonal-wheels/src/encryption/asymmetric/keys.ts:122

## Parameters

| Parameter    | Type        |
| ------------ | ----------- |
| `privateKey` | `CryptoKey` |
| `publicKey`  | `CryptoKey` |

## Returns

`Promise`\<`CryptoKey`\>
