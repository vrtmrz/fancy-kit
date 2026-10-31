[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [binary](../README.md) / tryConvertBase64ToArrayBufferBrowser

# Function: tryConvertBase64ToArrayBufferBrowser()

```ts
function tryConvertBase64ToArrayBufferBrowser(
  base64: string,
): false | ArrayBuffer;
```

Defined in: packages/octagonal-wheels/src/binary/base64.ts:390

Tries to convert a base64 string to an ArrayBuffer in a browser environment.

## Parameters

| Parameter | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| `base64`  | `string` | The base64 string to convert. |

## Returns

`false` \| `ArrayBuffer`

The converted ArrayBuffer if successful, otherwise false.
