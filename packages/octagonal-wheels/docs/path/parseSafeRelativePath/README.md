[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [path](../README.md) / parseSafeRelativePath

# Function: parseSafeRelativePath()

```ts
function parseSafeRelativePath(
  path: string,
  options?: SafeRelativePathOptions,
): SafeRelativePath;
```

Defined in: packages/octagonal-wheels/src/path.ts:132

Validates a canonical relative path without normalising or decoding it.

## Parameters

| Parameter | Type                                                              | Description                              |
| --------- | ----------------------------------------------------------------- | ---------------------------------------- |
| `path`    | `string`                                                          | The untrusted relative path to validate. |
| `options` | [`SafeRelativePathOptions`](../SafeRelativePathOptions/README.md) | Validation options.                      |

## Returns

[`SafeRelativePath`](../SafeRelativePath/README.md)

The original path branded as safe.

## Throws

[UnsafePathError](../UnsafePathError/README.md) When the path is absolute, drive-qualified, non-canonical, or contains an unsafe component.

## Remarks

Accepted paths use `/` separators. Empty components, `.` and `..` are
rejected, as are backslashes, control characters, portable-invalid names,
and Windows device names. Callers must decode archive, URL, or document
encodings before validation when those layers decode names before writing.
