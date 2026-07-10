[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [hkdf](../README.md) / encryptBinary

# Function: encryptBinary()

```ts
function encryptBinary(
   input: Uint8Array<ArrayBuffer>, 
   passphrase: string, 
pbkdf2Salt: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>>;
```

Defined in: [src/encryption/hkdf.ts:170](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/hkdf.ts#L170)

Encrypts a string using AES-GCM and returns the result as binary data (Uint8Array).

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | `Uint8Array`\<`ArrayBuffer`\> | The string to be encrypted. |
| `passphrase` | `string` | The passphrase. |
| `pbkdf2Salt` | `Uint8Array`\<`ArrayBuffer`\> | The salt for PBKDF2. |

## Returns

`Promise`\<`Uint8Array`\<`ArrayBuffer`\>\>

The encrypted binary data.
