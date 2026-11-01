[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [path](../README.md) / isSafeRelativePath

# Function: isSafeRelativePath()

```ts
function isSafeRelativePath(
  path: string,
  options?: SafeRelativePathOptions,
): path is SafeRelativePath;
```

Defined in: packages/octagonal-wheels/src/path.ts:155

Reports whether a value is a canonical safe relative path.

## Parameters

| Parameter | Type                                                              | Description          |
| --------- | ----------------------------------------------------------------- | -------------------- |
| `path`    | `string`                                                          | The path to inspect. |
| `options` | [`SafeRelativePathOptions`](../SafeRelativePathOptions/README.md) | Validation options.  |

## Returns

`path is SafeRelativePath`

`true` only when [parseSafeRelativePath](../parseSafeRelativePath/README.md) would accept it.
