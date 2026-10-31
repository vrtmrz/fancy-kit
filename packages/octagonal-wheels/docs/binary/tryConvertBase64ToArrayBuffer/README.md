[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [binary](../README.md) / tryConvertBase64ToArrayBuffer

# Variable: tryConvertBase64ToArrayBuffer

```ts
const tryConvertBase64ToArrayBuffer: (base64: string) => false | ArrayBuffer;
```

Defined in: packages/octagonal-wheels/src/binary/base64.ts:380

Tries to convert a base64 string to an ArrayBuffer.

Tries to convert a base64 string to an ArrayBuffer using native methods.

## Parameters

| Parameter | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| `base64`  | `string` | The base64 string to convert. |

## Returns

`false` \| `ArrayBuffer`

The converted ArrayBuffer if successful, otherwise false.

## Param

**base64**

The base64 string to convert.

## Returns

The converted ArrayBuffer if successful, otherwise false.
