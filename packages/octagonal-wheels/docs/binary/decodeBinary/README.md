[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [binary](../README.md) / decodeBinary

# Function: decodeBinary()

```ts
function decodeBinary(src: string | string[]): ArrayBuffer;
```

Defined in: [src/binary/index.ts:31](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/binary/index.ts#L31)

Decodes a binary string or an array of binary strings into an ArrayBuffer.
If the input is an empty string or array, it returns an empty ArrayBuffer.
If the input starts with '%', it decodes the string(s) using `_decodeToArrayBuffer` function.
Otherwise, it decodes the string(s) using `base64ToArrayBuffer` function.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `src` | `string` \| `string`[] | The binary string or array of binary strings to decode. |

## Returns

`ArrayBuffer`

The decoded ArrayBuffer.

## Remarks

Now, Self-hosted LiveSync always use base64 for encoding/decoding.
