[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [binary](../README.md) / readString

# Function: readString()

```ts
function readString(buffer: Uint8Array): string;
```

Defined in: packages/octagonal-wheels/src/binary/base64.ts:275

Converts a Uint8Array buffer to a string.

## Parameters

| Parameter | Type         | Description                       |
| --------- | ------------ | --------------------------------- |
| `buffer`  | `Uint8Array` | The Uint8Array buffer to convert. |

## Returns

`string`

The converted string.

## Remarks

Preserves a leading UTF-8 BOM as U+FEFF so that valid UTF-8 round-trips without dropping its first code point. Callers that treat a BOM as a document signature should remove it explicitly after decoding.
