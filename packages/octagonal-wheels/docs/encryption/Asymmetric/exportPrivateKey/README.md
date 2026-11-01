[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / exportPrivateKey

# Function: exportPrivateKey()

```ts
function exportPrivateKey(privateKey: CryptoKey): Promise<string>;
```

Defined in: packages/octagonal-wheels/src/encryption/asymmetric/keys.ts:234

Exports a private key in JWK format and returns it as a Base64-encoded string.

## Parameters

| Parameter    | Type        | Description                |
| ------------ | ----------- | -------------------------- |
| `privateKey` | `CryptoKey` | The private key to export. |

## Returns

`Promise`\<`string`\>

The Base64-encoded private key.

## Throws

Error if export fails.
