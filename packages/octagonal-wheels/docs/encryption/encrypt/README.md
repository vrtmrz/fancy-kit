[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [encryption](../README.md) / encrypt

# ~~Function: encrypt()~~

```ts
function encrypt(
   input: string, 
   passphrase: string, 
autoCalculateIterations: boolean): Promise<string>;
```

Defined in: [src/encryption/encryption.ts:200](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/encryption.ts#L200)

Encrypts the input string using AES-GCM encryption algorithm.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | `string` | The string to be encrypted. |
| `passphrase` | `string` | The passphrase used for encryption. |
| `autoCalculateIterations` | `boolean` | A boolean indicating whether to automatically calculate the iterations for key derivation. |

## Returns

`Promise`\<`string`\>

The encrypted data with initialization vector (iv) and salt. <br>  |%| iv(32) | salt(32) | data ....

## Deprecated

Use `hkdf` instead.
