[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [path](../README.md) / resolvePathWithinRoot

# Function: resolvePathWithinRoot()

```ts
function resolvePathWithinRoot(
  root: string,
  relativePath: string,
  options?: ResolvePathWithinRootOptions,
): string;
```

Defined in: packages/octagonal-wheels/src/path.ts:176

Resolves an untrusted relative path beneath a trusted root.

## Parameters

| Parameter      | Type                                                                        | Description                                                                                   |
| -------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `root`         | `string`                                                                    | A trusted root path. The root is preserved apart from trailing separators needed for joining. |
| `relativePath` | `string`                                                                    | The untrusted relative path to validate and join.                                             |
| `options`      | [`ResolvePathWithinRootOptions`](../ResolvePathWithinRootOptions/README.md) | Validation and output-separator options.                                                      |

## Returns

`string`

The root-contained path using the requested separator.

## Throws

[UnsafePathError](../UnsafePathError/README.md) When `relativePath` is unsafe.

## Throws

RangeError When a forged runtime separator is neither `/` nor ``.

## Remarks

The root is a trusted boundary supplied by the caller and is not normalised.
Containment follows from rejecting every absolute form and traversal
component before joining. An empty root is useful for vault-relative paths.
