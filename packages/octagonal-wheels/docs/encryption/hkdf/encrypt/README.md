[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [hkdf](../README.md) / encrypt

# Function: encrypt()

```ts
function encrypt(
   input: string, 
   passphrase: string, 
pbkdf2Salt: Uint8Array<ArrayBuffer>): Promise<string>;
```

Defined in: [src/encryption/hkdf.ts:192](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/hkdf.ts#L192)

Encrypts a string using AES-GCM and returns a Base64-encoded string (beginning with '%=').

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | `string` | The string to be encrypted. |
| `passphrase` | `string` | The passphrase. |
| `pbkdf2Salt` | `Uint8Array`\<`ArrayBuffer`\> | The salt for PBKDF2. |

## Returns

`Promise`\<`string`\>

The encrypted string (Base64, beginning with '%=').
