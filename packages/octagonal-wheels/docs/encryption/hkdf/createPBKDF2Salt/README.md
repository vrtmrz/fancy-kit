[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [hkdf](../README.md) / createPBKDF2Salt

# Function: createPBKDF2Salt()

```ts
function createPBKDF2Salt(): Uint8Array<ArrayBuffer>;
```

Defined in: [src/encryption/hkdf.ts:48](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/hkdf.ts#L48)

Generates a random salt for PBKDF2.

## Returns

`Uint8Array`\<`ArrayBuffer`\>

A Uint8Array of PBKDF2_SALT_LENGTH bytes.
