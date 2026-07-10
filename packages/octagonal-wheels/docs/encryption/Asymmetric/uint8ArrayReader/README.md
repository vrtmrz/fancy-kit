[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / uint8ArrayReader

# Function: uint8ArrayReader()

```ts
function uint8ArrayReader(array: Uint8Array): ReadableArray;
```

Defined in: [src/encryption/asymmetric/keys.ts:323](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/keys.ts#L323)

Creates a reader that reads a specified number of bytes at a time from a Uint8Array.
Bounds checking is provided to prevent buffer overrun attacks.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `array` | `Uint8Array` | The Uint8Array to read from. |

## Returns

[`ReadableArray`](../ReadableArray/README.md)

The reader object with a read method.

## Throws

Error if read operations exceed array bounds.
