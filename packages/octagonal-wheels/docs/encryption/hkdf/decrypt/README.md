[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [hkdf](../README.md) / decrypt

# Function: decrypt()

```ts
function decrypt(
   input: string, 
   passphrase: string, 
pbkdf2Salt: Uint8Array<ArrayBuffer>): Promise<string>;
```

Defined in: [src/encryption/hkdf.ts:259](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/hkdf.ts#L259)

Decrypts a Base64-encoded encrypted string (beginning with '%=') and returns the original string.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | `string` | The encrypted string (Base64, beginning with '%='). |
| `passphrase` | `string` | The passphrase. |
| `pbkdf2Salt` | `Uint8Array`\<`ArrayBuffer`\> | The salt for PBKDF2. |

## Returns

`Promise`\<`string`\>

The decrypted string.

## Throws

An exception is thrown if the input format is invalid or decryption fails.
