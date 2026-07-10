[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [binary](../README.md) / encodeBinary

# Function: encodeBinary()

```ts
function encodeBinary(src: ArrayBuffer | Uint8Array<ArrayBuffer>): Promise<string[]>;
```

Defined in: [src/binary/index.ts:52](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/binary/index.ts#L52)

Encodes a binary data into a string array using base64 encoding.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `src` | `ArrayBuffer` \| `Uint8Array`\<`ArrayBuffer`\> | The binary data to be encoded. It can be either a Uint8Array or an ArrayBuffer. |

## Returns

`Promise`\<`string`[]\>

A promise that resolves to a string array representing the encoded binary data.
