[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [hash](../../README.md) / [purejs](../README.md) / sha1

# Function: sha1()

```ts
function sha1(src: string): Promise<string>;
```

Defined in: packages/octagonal-wheels/src/hash/purejs.ts:93

Calculates the base-64 encoded SHA-1 hash of the given string.
Note: Very slow, use only when necessary. Prefer fallbackMixedHashEach for faster hashing.

## Parameters

| Parameter | Type     | Description                           |
| --------- | -------- | ------------------------------------- |
| `src`     | `string` | The string to calculate the hash for. |

## Returns

`Promise`\<`string`\>

A promise that resolves to the SHA-1 hash as a base64-encoded string.
