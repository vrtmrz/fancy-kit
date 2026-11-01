[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [binary](../README.md) / tryConvertBase64ToArrayBufferNative

# Function: tryConvertBase64ToArrayBufferNative()

```ts
function tryConvertBase64ToArrayBufferNative(
  base64: string,
): false | ArrayBuffer;
```

Defined in: packages/octagonal-wheels/src/binary/base64.ts:418

Tries to convert a base64 string to an ArrayBuffer using native methods.

## Parameters

| Parameter | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| `base64`  | `string` | The base64 string to convert. |

## Returns

`false` \| `ArrayBuffer`

The converted ArrayBuffer if successful, otherwise false.
