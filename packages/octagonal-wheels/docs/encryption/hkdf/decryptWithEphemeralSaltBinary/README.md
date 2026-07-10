[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [hkdf](../README.md) / decryptWithEphemeralSaltBinary

# Function: decryptWithEphemeralSaltBinary()

```ts
function decryptWithEphemeralSaltBinary(input: Uint8Array<ArrayBuffer>, passphrase: string): Promise<Uint8Array<ArrayBuffer>>;
```

Defined in: [src/encryption/hkdf.ts:366](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/hkdf.ts#L366)

Decrypts binary data that was encrypted with an ephemeral salt using a passphrase.

The input binary data is expected to contain, in order:
- Initialisation vector (IV)
- HKDF salt
- PBKDF2 salt
- Encrypted payload

The function extracts these components, then uses them along with the provided passphrase
to decrypt the payload.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | `Uint8Array`\<`ArrayBuffer`\> | The binary data to decrypt, containing IV, HKDF salt, PBKDF2 salt, and encrypted data. |
| `passphrase` | `string` | The passphrase used for decryption. |

## Returns

`Promise`\<`Uint8Array`\<`ArrayBuffer`\>\>

A promise that resolves to the decrypted binary data.

## Throws

If the input data length is invalid.
