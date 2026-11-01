[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [binary](../README.md) / arrayBufferToBase64Native

# Function: arrayBufferToBase64Native()

```ts
function arrayBufferToBase64Native(
  buffer: ArrayBuffer | Uint8Array<ArrayBuffer>,
): Promise<string[]>;
```

Defined in: packages/octagonal-wheels/src/binary/base64.ts:169

Converts an ArrayBuffer or Uint8Array to a base64 string using native methods.

## Parameters

| Parameter | Type                                           | Description                 |
| --------- | ---------------------------------------------- | --------------------------- |
| `buffer`  | `ArrayBuffer` \| `Uint8Array`\<`ArrayBuffer`\> | The ArrayBuffer to convert. |

## Returns

`Promise`\<`string`[]\>

A Promise that resolves to an array of base64 strings.
