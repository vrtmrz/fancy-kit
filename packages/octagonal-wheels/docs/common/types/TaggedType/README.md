[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [common](../../README.md) / [types](../README.md) / TaggedType

# Type Alias: TaggedType\<T, U\>

```ts
type TaggedType<T, U> = T & {
  [___tag]: U;
};
```

Defined in: packages/octagonal-wheels/src/common/types.ts:8

Tagged Type: Wrapping type with a unique symbol to make types _INCOMPATIBLE_ for the same type with different tags.

## Type Declaration

### \[\_\_\_tag\]

```ts
[___tag]: U;
```

## Type Parameters

| Type Parameter         |
| ---------------------- |
| `T`                    |
| `U` _extends_ `string` |

## Examples

```ts
var id = (TaggedType<string, "DocumentID"> = "AAA"); // This makes error
```

```ts
var id = (TaggedType<string, "DocumentID"> = "AAA" as TaggedType<
  string,
  "FileName"
>); // Also makes error
```
