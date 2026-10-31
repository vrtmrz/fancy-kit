[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [task](../README.md) / TaskResultWithKey

# Type Alias: TaskResultWithKey\<T, U\>

```ts
type TaskResultWithKey<T, U> = TaskResult<T, U> & {
  key: number;
};
```

Defined in: packages/octagonal-wheels/src/concurrency/task.ts:10

## Type Declaration

### key

```ts
key: number;
```

## Type Parameters

| Type Parameter        |
| --------------------- |
| `T`                   |
| `U` _extends_ `Error` |
