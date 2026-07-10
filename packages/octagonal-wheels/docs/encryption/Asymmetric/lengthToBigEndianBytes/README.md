[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / lengthToBigEndianBytes

# Function: lengthToBigEndianBytes()

```ts
function lengthToBigEndianBytes(length: number): Uint8Array;
```

Defined in: [src/encryption/asymmetric/keys.ts:288](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/keys.ts#L288)

Converts a 32-bit integer value to a big-endian Uint8Array (4 bytes).

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `length` | `number` | The integer value to convert (must be non-negative). |

## Returns

`Uint8Array`

The big-endian Uint8Array.

## Throws

Error if the length is invalid.
