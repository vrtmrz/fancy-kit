[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [binary](../README.md) / concatUInt8Array

# Function: concatUInt8Array()

```ts
function concatUInt8Array(arrays: Uint8Array<ArrayBufferLike>[]): Uint8Array<ArrayBuffer>;
```

Defined in: [src/binary/index.ts:10](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/binary/index.ts#L10)

Concatenates multiple Uint8Array arrays into a single Uint8Array.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arrays` | `Uint8Array`\<`ArrayBufferLike`\>[] | An array of Uint8Array arrays to be concatenated. |

## Returns

`Uint8Array`\<`ArrayBuffer`\>

A new Uint8Array containing the concatenated values.
