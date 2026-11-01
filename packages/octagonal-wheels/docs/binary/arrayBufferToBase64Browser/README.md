[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [binary](../README.md) / arrayBufferToBase64Browser

# Function: arrayBufferToBase64Browser()

```ts
function arrayBufferToBase64Browser(
  buffer: ArrayBuffer | Uint8Array<ArrayBuffer>,
): Promise<string[]>;
```

Defined in: packages/octagonal-wheels/src/binary/base64.ts:181

Converts an ArrayBuffer or Uint8Array to a base64 string using browser-compatible methods.

## Parameters

| Parameter | Type                                           | Description                 |
| --------- | ---------------------------------------------- | --------------------------- |
| `buffer`  | `ArrayBuffer` \| `Uint8Array`\<`ArrayBuffer`\> | The ArrayBuffer to convert. |

## Returns

`Promise`\<`string`[]\>

A Promise that resolves to an array of base64 strings.
