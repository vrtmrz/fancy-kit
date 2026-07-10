[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [encryption](../README.md) / encryptV3

# ~~Function: encryptV3()~~

```ts
function encryptV3(input: string, passphrase: string): Promise<string>;
```

Defined in: [src/encryption/encryptionv3.ts:83](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/encryptionv3.ts#L83)

Encrypts the input string using AES-GCM encryption algorithm with the provided passphrase.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | `string` | The string to be encrypted. |
| `passphrase` | `string` | The passphrase used for encryption. |

## Returns

`Promise`\<`string`\>

The encrypted string with the initialization vector (IV) prepended.

## Remarks

The salt is fixed and is not changed for every encryption due to performance reasons.
~~This function is still experimental and not guaranteed to be safe~~ Now deprecated. Not safe.

## Deprecated

Use `hkdf` instead.
