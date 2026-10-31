[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [encryption](../README.md) / decrypt

# ~~Function: decrypt()~~

```ts
function decrypt(
  encryptedResult: string,
  passphrase: string,
  autoCalculateIterations: boolean,
): Promise<string>;
```

Defined in: packages/octagonal-wheels/src/encryption/encryption.ts:255

Decrypts the encrypted result using the provided passphrase.

## Parameters

| Parameter                 | Type      | Description                                                             |
| ------------------------- | --------- | ----------------------------------------------------------------------- |
| `encryptedResult`         | `string`  | The encrypted result to decrypt.                                        |
| `passphrase`              | `string`  | The passphrase used for decryption.                                     |
| `autoCalculateIterations` | `boolean` | A boolean indicating whether to automatically calculate the iterations. |

## Returns

`Promise`\<`string`\>

A Promise that resolves to the decrypted string.

## Throws

If the encrypted data is corrupted or if decryption fails.

## Deprecated

Use `hkdf` instead.
