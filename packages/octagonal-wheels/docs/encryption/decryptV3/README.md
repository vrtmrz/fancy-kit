[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [encryption](../README.md) / decryptV3

# ~~Function: decryptV3()~~

```ts
function decryptV3(encryptedResult: string, passphrase: string): Promise<string>;
```

Defined in: [src/encryption/encryptionv3.ts:115](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/encryptionv3.ts#L115)

Decrypts the encrypted result using the provided passphrase.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `encryptedResult` | `string` | The encrypted result to be decrypted. |
| `passphrase` | `string` | The passphrase used for decryption. |

## Returns

`Promise`\<`string`\>

The decrypted plain text.

## Remarks

The salt is fixed and is not changed for every encryption due to performance reasons.
~~This function is still experimental and not guaranteed to be safe~~ Now deprecated.

## Deprecated

Use `hkdf` instead. Only decryption will permitted in the future.
