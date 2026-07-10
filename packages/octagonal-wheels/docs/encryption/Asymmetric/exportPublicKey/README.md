[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / exportPublicKey

# Function: exportPublicKey()

```ts
function exportPublicKey(publicKey: CryptoKey): Promise<string>;
```

Defined in: [src/encryption/asymmetric/keys.ts:217](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/keys.ts#L217)

Exports a public key in JWK format and returns it as a Base64-encoded string.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `publicKey` | `CryptoKey` | The public key to export. |

## Returns

`Promise`\<`string`\>

The Base64-encoded public key.

## Throws

Error if export fails.
