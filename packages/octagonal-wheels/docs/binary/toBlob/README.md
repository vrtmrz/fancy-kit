[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [binary](../README.md) / toBlob

# Function: toBlob()

```ts
function toBlob(
  data: string | ArrayBuffer | Uint8Array<ArrayBuffer> | string[] | Blob,
): Blob;
```

Defined in: packages/octagonal-wheels/src/binary/blob.ts:42

Normalises text, binary data, or an existing Blob to a Blob.

## Parameters

| Parameter | Type                                                                               | Description                                                  |
| --------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `data`    | `string` \| `ArrayBuffer` \| `Uint8Array`\<`ArrayBuffer`\> \| `string`[] \| `Blob` | Text, ordered text parts, binary bytes, or an existing Blob. |

## Returns

`Blob`

The original Blob, or a new text or binary Blob for other inputs.

## Remarks

Existing Blob instances retain their identity, MIME type, and bytes. Text
uses [createTextBlob](../createTextBlob/README.md); an ArrayBuffer or Uint8Array uses
[createBinaryBlob](../createBinaryBlob/README.md). No decoding or content inspection is performed.
Instance checks use the current realm's global constructors. The focused
module can be imported without DOM or fetch globals; calls require Blob.
