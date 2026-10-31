[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / encryptConfig

# Function: encryptConfig()

```ts
function encryptConfig(
  configData: object,
  publicKey: CryptoKey,
): Promise<string>;
```

Defined in: packages/octagonal-wheels/src/encryption/asymmetric/asymmetricHelper.ts:17

Encrypts configuration data using a hybrid method of RSA-OAEP and AES-GCM.

## Parameters

| Parameter    | Type        | Description                                           |
| ------------ | ----------- | ----------------------------------------------------- |
| `configData` | `object`    | The configuration data to be encrypted (JSON object). |
| `publicKey`  | `CryptoKey` | The public key to use for encryption.                 |

## Returns

`Promise`\<`string`\>

The encrypted data, encoded as a Base64 string.
