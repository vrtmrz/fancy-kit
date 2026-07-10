[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / importEncryptionPrivateKey

# Function: importEncryptionPrivateKey()

```ts
function importEncryptionPrivateKey(privateKeyString: string): Promise<CryptoKey>;
```

Defined in: [src/encryption/asymmetric/keys.ts:270](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/keys.ts#L270)

Restores a CryptoKey from a Base64-encoded private key string.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `privateKeyString` | `string` | The Base64-encoded private key. |

## Returns

`Promise`\<`CryptoKey`\>

The restored private key.

## Throws

Error if import fails or the key format is invalid.
