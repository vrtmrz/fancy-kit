[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [scopedIteration](../README.md) / IterationResult

# Type Alias: IterationResult

```ts
type IterationResult =
  | {
      started: number;
      status: "completed";
    }
  | {
      started: number;
      status: "cancelled";
    };
```

Defined in: packages/octagonal-wheels/src/concurrency/scoped.iteration.ts:17

Counts invoked callbacks, rather than application-level successful operations.
