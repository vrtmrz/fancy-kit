[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [scopedIteration](../README.md) / IterationScope

# Type Alias: IterationScope

```ts
type IterationScope = Scope<unknown> & {
  isCancelled?: boolean;
};
```

Defined in: packages/octagonal-wheels/src/concurrency/scoped.iteration.ts:5

A shared scope with optional cooperative cancellation observation.

## Type Declaration

### isCancelled()?

```ts
optional isCancelled(): boolean;
```

Reports cancellation of the operation which owns the iteration.

#### Returns

`boolean`
