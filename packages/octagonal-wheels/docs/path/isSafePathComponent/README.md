[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [path](../README.md) / isSafePathComponent

# Function: isSafePathComponent()

```ts
function isSafePathComponent(component: string): component is SafePathComponent;
```

Defined in: packages/octagonal-wheels/src/path.ts:114

Reports whether a value is one portable path component.

## Parameters

| Parameter   | Type     | Description               |
| ----------- | -------- | ------------------------- |
| `component` | `string` | The component to inspect. |

## Returns

`component is SafePathComponent`

`true` only when [parseSafePathComponent](../parseSafePathComponent/README.md) would accept it.
