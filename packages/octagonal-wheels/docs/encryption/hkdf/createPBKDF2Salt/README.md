[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [hkdf](../README.md) / createPBKDF2Salt

# Function: createPBKDF2Salt()

```ts
function createPBKDF2Salt(): Uint8Array<ArrayBuffer>;
```

Defined in: packages/octagonal-wheels/src/encryption/hkdf.ts:48

Generates a random salt for PBKDF2.

## Returns

`Uint8Array`\<`ArrayBuffer`\>

A Uint8Array of PBKDF2_SALT_LENGTH bytes.
