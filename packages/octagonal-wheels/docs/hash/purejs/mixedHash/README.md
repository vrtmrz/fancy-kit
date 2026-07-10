[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [hash](../../README.md) / [purejs](../README.md) / mixedHash

# Function: mixedHash()

```ts
function mixedHash(
   str: string, 
   seed: number, 
   fnv1aHash_: number): [number, number];
```

Defined in: [src/hash/purejs.ts:24](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/hash/purejs.ts#L24)

Computes a mixed hash of a given string using MurmurHash3 and FNV-1a hash algorithms.
The MurmurHash3 is used as the primary hash, while the FNV-1a hash is used as a secondary hash.
This function is fallback for the xxhash.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `str` | `string` | `undefined` | The input string to hash. |
| `seed` | `number` | `undefined` | The seed value for the MurmurHash3 algorithm. |
| `fnv1aHash_` | `number` | `epochFNV1a` | The initial value for the FNV-1a hash algorithm. Defaults to `epochFNV1a`. |

## Returns

\[`number`, `number`\]

A tuple containing the resulting MurmurHash3 hash and FNV-1a hash. fnv-1a hash should be used as a supplementary hash.
