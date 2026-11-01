[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [resource](../../README.md) / [scope](../README.md) / ScopedStep

# Type Alias: ScopedStep\<I, O, E\>

```ts
type ScopedStep<I, O, E> = (ctx: Scope<I> & E) => Awaitable<O>;
```

Defined in: packages/octagonal-wheels/src/resource/scope.ts:18

An operation which consumes I, produces O, and borrows the supplied capabilities E.

## Type Parameters

| Type Parameter         | Default type |
| ---------------------- | ------------ |
| `I`                    | -            |
| `O`                    | -            |
| `E` _extends_ `object` | `object`     |

## Parameters

| Parameter | Type                                       |
| --------- | ------------------------------------------ |
| `ctx`     | [`Scope`](../Scope/README.md)\<`I`\> & `E` |

## Returns

[`Awaitable`](../Awaitable/README.md)\<`O`\>
