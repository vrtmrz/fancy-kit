[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [hkdf](../README.md) / decryptWithEphemeralSalt

# Function: decryptWithEphemeralSalt()

```ts
function decryptWithEphemeralSalt(input: string, passphrase: string): Promise<string>;
```

Defined in: [src/encryption/hkdf.ts:393](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/hkdf.ts#L393)

Decrypts a base64-encoded string that was encrypted using an ephemeral salt and a passphrase.
The input string must start with the expected prefix to indicate the encryption format.
Internally, this function decodes the base64 input, decrypts the binary data using the provided passphrase,
and returns the resulting plaintext string.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | `string` | The base64-encoded encrypted string, prefixed with `HKDF_SALTED_ENCRYPTED_PREFIX`. |
| `passphrase` | `string` | The passphrase used for decryption. |

## Returns

`Promise`\<`string`\>

A promise that resolves to the decrypted plaintext string.

## Throws

If the input does not start with the expected prefix or decryption fails.
