[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [task](../README.md) / TaskResultWithKey

# Type Alias: TaskResultWithKey\<T, U\>

```ts
type TaskResultWithKey<T, U> = TaskResult<T, U> & {
  key: number;
};
```

Defined in: [src/concurrency/task.ts:10](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/task.ts#L10)

## Type Declaration

### key

```ts
key: number;
```

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
| `U` *extends* `Error` |
