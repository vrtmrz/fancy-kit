[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [task](../README.md) / Task

# Type Alias: Task\<T\>

```ts
type Task<T> = 
  | TaskProcessing<T>
| TaskWaiting<T>;
```

Defined in: [src/concurrency/task.ts:6](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/task.ts#L6)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
