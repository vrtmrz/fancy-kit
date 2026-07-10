[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [hkdf](../README.md) / encryptWithEphemeralSalt

# Function: encryptWithEphemeralSalt()

```ts
function encryptWithEphemeralSalt(
   input: string, 
   passphrase: string, 
refresh: boolean): Promise<string>;
```

Defined in: [src/encryption/hkdf.ts:343](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/hkdf.ts#L343)

Encrypts a string using a passphrase and an ephemeral salt.
The function internally converts the input string to binary, encrypts it,
and returns the result as a base64-encoded string prefixed with a constant.
Note that this function keeps the same PBKDF2 salt for the session unless `refresh` is set to true.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `input` | `string` | `undefined` | The plaintext string to encrypt. |
| `passphrase` | `string` | `undefined` | The passphrase used for encryption. |
| `refresh` | `boolean` | `false` | If true, generates a new PBKDF2 salt for the session. |

## Returns

`Promise`\<`string`\>

A promise that resolves to the encrypted string in base64 format with a prefix.
