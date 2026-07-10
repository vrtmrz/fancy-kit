[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / exportKeyPair

# Function: exportKeyPair()

```ts
function exportKeyPair(keyPair: CryptoKeyPair): Promise<{
  privateKey: string;
  publicKey: string;
}>;
```

Defined in: [src/encryption/asymmetric/keys.ts:205](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/keys.ts#L205)

Exports a key pair (public and private keys) in a format suitable for storage or transmission.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keyPair` | `CryptoKeyPair` | The key pair to export. |

## Returns

`Promise`\<\{
  `privateKey`: `string`;
  `publicKey`: `string`;
\}\>

The exported public and private keys as Base64-encoded strings.
