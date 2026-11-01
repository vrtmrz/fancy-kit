[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [binary](../README.md) / createTextBlob

# Function: createTextBlob()

```ts
function createTextBlob(data: string | string[]): Blob;
```

Defined in: packages/octagonal-wheels/src/binary/blob.ts:11

Creates a new plain-text Blob from a string or ordered string parts.

## Parameters

| Parameter | Type                   | Description                                   |
| --------- | ---------------------- | --------------------------------------------- |
| `data`    | `string` \| `string`[] | Text parts, concatenated without a separator. |

## Returns

`Blob`

A new Blob with the exact MIME type `text/plain`.

## Remarks

Line endings remain unchanged. Each part uses the native Blob constructor's
string conversion, including replacement of unpaired UTF-16 surrogates.
Requires the standard global Blob constructor when called.
