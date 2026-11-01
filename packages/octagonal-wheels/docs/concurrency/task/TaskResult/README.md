[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [task](../README.md) / TaskResult

# Type Alias: TaskResult\<T, U\>

```ts
type TaskResult<T, U> =
  | {
      ok: T;
    }
  | {
      err: U;
    };
```

Defined in: packages/octagonal-wheels/src/concurrency/task.ts:8

## Type Parameters

| Type Parameter        |
| --------------------- |
| `T`                   |
| `U` _extends_ `Error` |
