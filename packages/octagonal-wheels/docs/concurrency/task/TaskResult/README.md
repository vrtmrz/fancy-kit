[**octagonal-wheels**](../../../README.md)

***

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

Defined in: [src/concurrency/task.ts:8](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/task.ts#L8)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
| `U` *extends* `Error` |
