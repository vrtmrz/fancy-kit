[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [binary](../README.md) / \_encodeBinary

# ~~Function: \_encodeBinary()~~

```ts
function _encodeBinary(buffer: Uint8Array): Promise<string[]>;
```

Defined in: [src/binary/encodedUTF16.ts:46](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/binary/encodedUTF16.ts#L46)

Encodes a binary buffer into an array of strings.
If the buffer length is less than BINARY_CHUNK_MAX, it encodes the entire buffer into a single string.
If the buffer length is greater than or equal to BINARY_CHUNK_MAX, it splits the buffer into chunks and encodes each chunk into a separate string.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `buffer` | `Uint8Array` | The binary buffer to encode. |

## Returns

`Promise`\<`string`[]\>

A promise that resolves to an array of encoded strings.

## Deprecated

Use `encodeBinary` instead. `encodeBinary` uses a base64 encoding, which is more efficient and reliable.
