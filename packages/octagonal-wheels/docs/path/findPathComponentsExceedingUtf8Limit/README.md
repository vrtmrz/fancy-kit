[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [path](../README.md) / findPathComponentsExceedingUtf8Limit

# Function: findPathComponentsExceedingUtf8Limit()

```ts
function findPathComponentsExceedingUtf8Limit(
  path: string,
  maxBytes: number,
): OversizedPathComponent[];
```

Defined in: packages/octagonal-wheels/src/path.ts:209

Finds path components whose UTF-8 encoded length exceeds a byte limit.

## Parameters

| Parameter  | Type     | Description                                                 |
| ---------- | -------- | ----------------------------------------------------------- |
| `path`     | `string` | A path whose components are separated by forward slashes.   |
| `maxBytes` | `number` | The maximum permitted UTF-8 byte length for each component. |

## Returns

[`OversizedPathComponent`](../OversizedPathComponent/README.md)[]

Oversized non-empty components in their original order, with their
UTF-8 byte lengths.

## Remarks

Leading, trailing, and repeated slashes produce empty components,
which are omitted. The comparison is strictly greater than `maxBytes`.
Components are measured independently; the complete path length is ignored.
Calling this function requires the standard global TextEncoder constructor.
