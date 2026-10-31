[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / generateEncryptionKeyPair

# Function: generateEncryptionKeyPair()

```ts
function generateEncryptionKeyPair(
  options?: CryptographicKeyConfig,
): Promise<CryptoKeyPair>;
```

Defined in: packages/octagonal-wheels/src/encryption/asymmetric/keys.ts:49

Generates a key pair for RSA encryption.

## Parameters

| Parameter  | Type                                                            | Description                                                           |
| ---------- | --------------------------------------------------------------- | --------------------------------------------------------------------- |
| `options?` | [`CryptographicKeyConfig`](../CryptographicKeyConfig/README.md) | Options for key generation, such as modulusLength and publicExponent. |

## Returns

`Promise`\<`CryptoKeyPair`\>

The generated RSA key pair.

## Throws

Error if key generation fails.
