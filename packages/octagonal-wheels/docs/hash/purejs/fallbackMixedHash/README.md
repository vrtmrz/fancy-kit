[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [hash](../../README.md) / [purejs](../README.md) / fallbackMixedHash

# Function: fallbackMixedHash()

```ts
function fallbackMixedHash(src: string[]): string;
```

Defined in: [src/hash/purejs.ts:72](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/hash/purejs.ts#L72)

Computes a mixed hash from an array of strings using Murmur3 and FNV-1a hash algorithms.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `src` | `string`[] | An array of strings to be hashed. |

## Returns

`string`

A string representing the mixed hash value in base-36 format.
