[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [binary](../README.md) / isBlobContentEqual

# Function: isBlobContentEqual()

```ts
function isBlobContentEqual(
  left: Blob,
  right: Blob,
  isArrayBufferEqual?: ArrayBufferContentEquality,
): Promise<boolean>;
```

Defined in: packages/octagonal-wheels/src/binary/blob.ts:91

Tests whether two Blobs contain equal bytes, independently of their MIME types.

## Parameters

| Parameter            | Type                                                                    | Default value               | Description                                                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `left`               | `Blob`                                                                  | `undefined`                 | The first Blob. Use [toBlob](../toBlob/README.md) to normalise other inputs.                                                                                                                 |
| `right`              | `Blob`                                                                  | `undefined`                 | The second Blob.                                                                                                                                                                             |
| `isArrayBufferEqual` | [`ArrayBufferContentEquality`](../ArrayBufferContentEquality/README.md) | `isArrayBufferContentEqual` | Equality predicate for each pair of parts. Defaults to native Uint8Array.toBase64 comparison when available, with direct byte comparison otherwise. The fallback creates no encoded strings. |

## Returns

`Promise`\<`boolean`\>

Whether the sizes and all corresponding parts are equal.

## Remarks

Different sizes return false without reading content or calling the
predicate. Empty Blobs return true without reading or calling the predicate.
Equal sizes are read sequentially, in parts of at most 10,000 bytes: first
the left part, then the right part, then the equality predicate. The next
pair is read only after that predicate resolves true. Reads use sliced parts
rather than calling `arrayBuffer()` on the original Blobs. The function does
not select IndexedDB or inspect metadata.
Read failures and predicate failures propagate unchanged. A custom predicate
is responsible for deciding byte equality and for its own working memory.
