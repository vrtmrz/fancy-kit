[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [binary](../README.md) / ArrayBufferContentEquality

# Type Alias: ArrayBufferContentEquality

```ts
type ArrayBufferContentEquality = (
  left: ArrayBuffer,
  right: ArrayBuffer,
) => boolean | PromiseLike<boolean>;
```

Defined in: packages/octagonal-wheels/src/binary/blob.ts:55

Tests whether two ArrayBuffers contain equal bytes.

Used by [isBlobContentEqual](../isBlobContentEqual/README.md) for pairs of equally sized parts containing
at most 10,000 bytes each. A predicate may complete synchronously or
asynchronously. A false result stops further reads; failures propagate.

## Parameters

| Parameter | Type          |
| --------- | ------------- |
| `left`    | `ArrayBuffer` |
| `right`   | `ArrayBuffer` |

## Returns

`boolean` \| `PromiseLike`\<`boolean`\>
