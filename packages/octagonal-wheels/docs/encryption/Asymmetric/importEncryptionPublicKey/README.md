[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / importEncryptionPublicKey

# Function: importEncryptionPublicKey()

```ts
function importEncryptionPublicKey(publicKeyString: string): Promise<CryptoKey>;
```

Defined in: packages/octagonal-wheels/src/encryption/asymmetric/keys.ts:250

Restores a CryptoKey from a Base64-encoded public key string.

## Parameters

| Parameter         | Type     | Description                    |
| ----------------- | -------- | ------------------------------ |
| `publicKeyString` | `string` | The Base64-encoded public key. |

## Returns

`Promise`\<`CryptoKey`\>

The restored public key.

## Throws

Error if import fails or the key format is invalid.
