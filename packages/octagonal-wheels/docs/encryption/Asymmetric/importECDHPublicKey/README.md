[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / importECDHPublicKey

# Function: importECDHPublicKey()

```ts
function importECDHPublicKey(ephemeralPublicKey: Uint8Array<ArrayBuffer>, curve: ECDH_CURVES): Promise<CryptoKey>;
```

Defined in: [src/encryption/asymmetric/keys.ts:166](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/keys.ts#L166)

Imports an ECDH public key from a Uint8Array.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `ephemeralPublicKey` | `Uint8Array`\<`ArrayBuffer`\> | `undefined` | The public key as a Uint8Array. |
| `curve` | [`ECDH_CURVES`](../ECDH_CURVES/README.md) | `DEFAULT_ECDH_CURVE` | - |

## Returns

`Promise`\<`CryptoKey`\>

The restored CryptoKey.

## Throws

Error if import fails.
