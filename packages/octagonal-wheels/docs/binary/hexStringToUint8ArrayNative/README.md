[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [binary](../README.md) / hexStringToUint8ArrayNative

# Function: hexStringToUint8ArrayNative()

```ts
function hexStringToUint8ArrayNative(src: string): Uint8Array<ArrayBuffer>;
```

Defined in: [src/binary/hex.ts:39](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/binary/hex.ts#L39)

Converts a hexadecimal string to a Uint8Array using native methods.
Each pair of characters in the input string represents a byte in the output Uint8Array.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `src` | `string` | The hexadecimal string to convert. |

## Returns

`Uint8Array`\<`ArrayBuffer`\>

The Uint8Array representation of the input string.
