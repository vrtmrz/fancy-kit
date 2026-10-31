[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [hash](../../README.md) / [purejs](../README.md) / sha1Hash

# Function: sha1Hash()

```ts
function sha1Hash(str: string): Promise<string>;
```

Defined in: packages/octagonal-wheels/src/hash/purejs.ts:108

Calculates the hex encoded SHA-1 hash of the given string.
Note: Very slow, use only when necessary. Prefer fallbackMixedHashEach for faster hashing.

## Parameters

| Parameter | Type     | Description                           |
| --------- | -------- | ------------------------------------- |
| `str`     | `string` | The string to calculate the hash for. |

## Returns

`Promise`\<`string`\>

A promise that resolves to the SHA-1 hash as a hex-encoded string.
