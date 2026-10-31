[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [scopedIteration](../README.md) / IterationMapResult

# Type Alias: IterationMapResult\<R\>

```ts
type IterationMapResult<R> =
  | {
      status: "completed";
      values: readonly R[];
    }
  | {
      status: "cancelled";
      values: readonly R[];
    };
```

Defined in: packages/octagonal-wheels/src/concurrency/scoped.iteration.ts:22

Returned values of started callbacks, ordered by their input index.

## Type Parameters

| Type Parameter |
| -------------- |
| `R`            |
