[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / generateAgreementKeyPair

# Function: generateAgreementKeyPair()

```ts
function generateAgreementKeyPair(namedCurve: ECDH_CURVES): Promise<CryptoKeyPair>;
```

Defined in: [src/encryption/asymmetric/keys.ts:81](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/keys.ts#L81)

Generates a key pair for ECDH key agreement.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `namedCurve` | [`ECDH_CURVES`](../ECDH_CURVES/README.md) | `DEFAULT_ECDH_CURVE` | The elliptic curve to use. "P-256" is a suitable default. |

## Returns

`Promise`\<`CryptoKeyPair`\>

The generated ECDH key pair.

## Throws

Error if key generation fails.
