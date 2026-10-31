[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [path](../README.md) / UnsafePathReason

# Type Alias: UnsafePathReason

```ts
type UnsafePathReason =
  | "empty-path"
  | "absolute-path"
  | "empty-component"
  | "dot-component"
  | "control-character"
  | "invalid-character"
  | "trailing-dot-or-space"
  | "reserved-name";
```

Defined in: packages/octagonal-wheels/src/path.ts:11

The reason that a path or path component was rejected.
