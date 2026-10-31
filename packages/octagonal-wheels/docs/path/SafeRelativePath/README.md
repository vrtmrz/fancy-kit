[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [path](../README.md) / SafeRelativePath

# Type Alias: SafeRelativePath

```ts
type SafeRelativePath = string & {
  [safeRelativePathBrand]: true;
};
```

Defined in: packages/octagonal-wheels/src/path.ts:8

A canonical, forward-slash-separated relative path that has passed the OW path-safety contract.

## Type Declaration

### \[safeRelativePathBrand\]

```ts
readonly [safeRelativePathBrand]: true;
```
