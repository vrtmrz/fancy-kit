[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [binary](../README.md) / arrayBufferToBase64Single

# Variable: arrayBufferToBase64Single

```ts
const arrayBufferToBase64Single: (
  buffer: ArrayBuffer | Uint8Array<ArrayBuffer>,
) => Promise<string>;
```

Defined in: packages/octagonal-wheels/src/binary/base64.ts:159

Converts an ArrayBuffer or Uint8Array to a base64 string.

Converts an ArrayBuffer or Uint8Array to a base64 string using native methods.

## Parameters

| Parameter | Type                                           | Description                 |
| --------- | ---------------------------------------------- | --------------------------- |
| `buffer`  | `ArrayBuffer` \| `Uint8Array`\<`ArrayBuffer`\> | The ArrayBuffer to convert. |

## Returns

`Promise`\<`string`\>

A Promise that resolves to the base64 string representation of the ArrayBuffer.

## Param

**buffer**

The ArrayBuffer to convert.

## Returns

A Promise that resolves to the base64 string representation of the ArrayBuffer.
