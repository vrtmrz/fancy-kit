[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [encryption](../README.md) / encryptV1

# ~~Function: encryptV1()~~

```ts
function encryptV1(
   input: string, 
   passphrase: string, 
autoCalculateIterations: boolean): Promise<string>;
```

Defined in: [src/encryption/encryption.ts:176](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/encryption.ts#L176)

Encrypts the input string using AES-GCM encryption algorithm.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | `string` | The string to be encrypted. |
| `passphrase` | `string` | The passphrase used for encryption. |
| `autoCalculateIterations` | `boolean` | A boolean indicating whether to automatically calculate the iterations for key derivation. |

## Returns

`Promise`\<`string`\>

A string representing the encrypted data, initialization vector (IV), and salt in JSON format.

## Deprecated

Use `hkdf` instead.
