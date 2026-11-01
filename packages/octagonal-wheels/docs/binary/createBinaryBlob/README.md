[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [binary](../README.md) / createBinaryBlob

# Function: createBinaryBlob()

```ts
function createBinaryBlob(data: ArrayBuffer | Uint8Array<ArrayBuffer>): Blob;
```

Defined in: packages/octagonal-wheels/src/binary/blob.ts:26

Creates a new binary Blob containing a snapshot of the supplied bytes.

## Parameters

| Parameter | Type                                           | Description                                              |
| --------- | ---------------------------------------------- | -------------------------------------------------------- |
| `data`    | `ArrayBuffer` \| `Uint8Array`\<`ArrayBuffer`\> | An ArrayBuffer or a Uint8Array backed by an ArrayBuffer. |

## Returns

`Blob`

A new Blob with the exact MIME type `application/octet-stream`.

## Remarks

A Uint8Array contributes only its visible byte range, not its entire backing
buffer. Later changes to the input bytes do not change the Blob.
Requires the standard global Blob constructor when called.
