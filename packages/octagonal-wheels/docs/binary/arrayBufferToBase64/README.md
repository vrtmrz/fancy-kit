[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [binary](../README.md) / arrayBufferToBase64

# Variable: arrayBufferToBase64

```ts
const arrayBufferToBase64: (
  buffer: ArrayBuffer | Uint8Array<ArrayBuffer>,
) => Promise<string[]>;
```

Defined in: packages/octagonal-wheels/src/binary/base64.ts:206

Converts an ArrayBuffer or Uint8Array to a base64 string.

Converts an ArrayBuffer or Uint8Array to a base64 string using native methods.

## Parameters

| Parameter | Type                                           | Description                 |
| --------- | ---------------------------------------------- | --------------------------- |
| `buffer`  | `ArrayBuffer` \| `Uint8Array`\<`ArrayBuffer`\> | The ArrayBuffer to convert. |

## Returns

`Promise`\<`string`[]\>

A Promise that resolves to an array of base64 strings.

## Param

**buffer**

The ArrayBuffer to convert.

## Returns

A Promise that resolves to an array of base64 strings.
