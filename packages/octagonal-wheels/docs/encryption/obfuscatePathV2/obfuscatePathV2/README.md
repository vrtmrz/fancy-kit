[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [obfuscatePathV2](../README.md) / obfuscatePathV2

# Function: obfuscatePathV2()

```ts
function obfuscatePathV2<T>(
   path: T, 
   passphrase: string, 
hkdfSalt: Uint8Array<ArrayBuffer>): Promise<string>;
```

Defined in: [src/encryption/obfuscatePathV2.ts:74](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/obfuscatePathV2.ts#L74)

Obfuscates a path using the V2 method.
If the path is already obfuscated, it is returned as is.

1. A key is derived from the passphrase and salt using HKDF.
2. The path is hashed using HMAC.
3. The result is encoded using base64url.
4. The prefix is added and the result is returned.

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `string` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `path` | `T` | The path to be obfuscated |
| `passphrase` | `string` | The passphrase |
| `hkdfSalt` | `Uint8Array`\<`ArrayBuffer`\> | The salt for HKDF |

## Returns

`Promise`\<`string`\>

The obfuscated path (returned as a Promise)
