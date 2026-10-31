[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / bigEndianBytesToLength

# Function: bigEndianBytesToLength()

```ts
function bigEndianBytesToLength(bytes: Uint8Array): number;
```

Defined in: packages/octagonal-wheels/src/encryption/asymmetric/keys.ts:308

Converts a big-endian Uint8Array (4 bytes) to a 32-bit integer value.

## Parameters

| Parameter | Type         | Description                                          |
| --------- | ------------ | ---------------------------------------------------- |
| `bytes`   | `Uint8Array` | The Uint8Array to convert (must be exactly 4 bytes). |

## Returns

`number`

The converted integer value.

## Throws

Error if the bytes array is invalid.
