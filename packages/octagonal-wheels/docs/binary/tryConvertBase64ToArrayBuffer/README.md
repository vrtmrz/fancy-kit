[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [binary](../README.md) / tryConvertBase64ToArrayBuffer

# Variable: tryConvertBase64ToArrayBuffer()

```ts
const tryConvertBase64ToArrayBuffer: (base64: string) => false | ArrayBuffer;
```

Defined in: [src/binary/base64.ts:358](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/binary/base64.ts#L358)

Tries to convert a base64 string to an ArrayBuffer.

Tries to convert a base64 string to an ArrayBuffer using native methods.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `base64` | `string` | The base64 string to convert. |

## Returns

`false` \| `ArrayBuffer`

The converted ArrayBuffer if successful, otherwise false.

## Param

The base64 string to convert.

## Returns

The converted ArrayBuffer if successful, otherwise false.
