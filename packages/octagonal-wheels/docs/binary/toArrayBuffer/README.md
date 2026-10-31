[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [binary](../README.md) / toArrayBuffer

# Function: toArrayBuffer()

```ts
function toArrayBuffer(
  source: ArrayBuffer | ArrayBufferView<ArrayBufferLike>,
): ArrayBuffer;
```

Defined in: packages/octagonal-wheels/src/binary/arrayBuffer.ts:12

Returns an `ArrayBuffer` containing exactly the bytes visible through the input.

## Parameters

| Parameter | Type                                                    | Description                                                                |
| --------- | ------------------------------------------------------- | -------------------------------------------------------------------------- |
| `source`  | `ArrayBuffer` \| `ArrayBufferView`\<`ArrayBufferLike`\> | An `ArrayBuffer`, `DataView`, typed array, or Node-compatible buffer view. |

## Returns

`ArrayBuffer`

The original `ArrayBuffer` when it already represents the exact range; otherwise, an independent copy of the visible bytes.

## Remarks

Views with a non-zero `byteOffset`, views shorter than their backing buffer, and
views backed by `SharedArrayBuffer` are copied. Bytes outside the view are never
included, and subsequent mutations of the source do not affect a copied result.
