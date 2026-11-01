[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [path](../README.md) / ResolvePathWithinRootOptions

# Interface: ResolvePathWithinRootOptions

Defined in: packages/octagonal-wheels/src/path.ts:28

Options controlling safe root containment.

## Extends

- [`SafeRelativePathOptions`](../SafeRelativePathOptions/README.md)

## Properties

| Property                              | Type          | Description                                                                  | Inherited from                                                                                                                    | Defined in                               |
| ------------------------------------- | ------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| <a id="allowempty"></a> `allowEmpty?` | `boolean`     | Whether the empty string may represent the root itself. Defaults to `false`. | [`SafeRelativePathOptions`](../SafeRelativePathOptions/README.md).[`allowEmpty`](../SafeRelativePathOptions/README.md#allowempty) | packages/octagonal-wheels/src/path.ts:24 |
| <a id="separator"></a> `separator?`   | `"/"` \| "\\" | The separator used in the returned path. Defaults to `/`.                    | -                                                                                                                                 | packages/octagonal-wheels/src/path.ts:30 |
