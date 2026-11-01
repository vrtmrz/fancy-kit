[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [path](../README.md) / parseSafePathComponent

# Function: parseSafePathComponent()

```ts
function parseSafePathComponent(component: string): SafePathComponent;
```

Defined in: packages/octagonal-wheels/src/path.ts:102

Validates one portable path component without changing it.

## Parameters

| Parameter   | Type     | Description                          |
| ----------- | -------- | ------------------------------------ |
| `component` | `string` | The untrusted component to validate. |

## Returns

[`SafePathComponent`](../SafePathComponent/README.md)

The original component branded as safe.

## Throws

[UnsafePathError](../UnsafePathError/README.md) When the component is empty, is `.` or `..`, contains a separator or control/portable-invalid character, ends in a dot or space, or is a reserved device name.

## Remarks

This conservative contract is suitable for names that may cross Windows,
macOS, Linux, Obsidian vaults, and archive formats. It deliberately does not
normalise Unicode or enforce filesystem-specific length limits.
