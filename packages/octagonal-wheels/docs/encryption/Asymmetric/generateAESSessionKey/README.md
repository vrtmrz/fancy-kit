[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / generateAESSessionKey

# Function: generateAESSessionKey()

```ts
function generateAESSessionKey(): Promise<SessionKey>;
```

Defined in: [src/encryption/asymmetric/keys.ts:103](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/keys.ts#L103)

Generates a new AES session key for data encryption.
AES-256-GCM is used for authenticated encryption.

## Returns

`Promise`\<[`SessionKey`](../SessionKey/README.md)\>

The new AES session key and IV.

## Throws

Error if key generation fails.
