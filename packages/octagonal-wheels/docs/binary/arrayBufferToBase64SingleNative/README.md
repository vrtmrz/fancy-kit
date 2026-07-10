[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [binary](../README.md) / arrayBufferToBase64SingleNative

# Function: arrayBufferToBase64SingleNative()

```ts
function arrayBufferToBase64SingleNative(buffer: ArrayBuffer | Uint8Array<ArrayBuffer>): Promise<string>;
```

Defined in: [src/binary/base64.ts:131](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/binary/base64.ts#L131)

Converts an ArrayBuffer or Uint8Array to a base64 string using native methods.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `buffer` | `ArrayBuffer` \| `Uint8Array`\<`ArrayBuffer`\> | The ArrayBuffer to convert. |

## Returns

`Promise`\<`string`\>

A Promise that resolves to the base64 string representation of the ArrayBuffer.
