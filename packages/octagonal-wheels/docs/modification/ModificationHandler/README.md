[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [modification](../README.md) / ModificationHandler

# Type Alias: ModificationHandler\<TTarget, TSource\>

```ts
type ModificationHandler<TTarget, TSource> = (
  target: TTarget,
  source: TSource,
) => Promise<"changed" | "unchanged">;
```

Defined in: packages/octagonal-wheels/src/modification.ts:2

Resolves to `changed` after a successful write, or `unchanged` when existing content matches.

## Type Parameters

| Type Parameter |
| -------------- |
| `TTarget`      |
| `TSource`      |

## Parameters

| Parameter | Type      |
| --------- | --------- |
| `target`  | `TTarget` |
| `source`  | `TSource` |

## Returns

`Promise`\<`"changed"` \| `"unchanged"`\>
