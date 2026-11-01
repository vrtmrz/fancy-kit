[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [lock](../README.md) / Task

# Type Alias: Task\<T\>

```ts
type Task<T> = () => Promise<T> | T;
```

Defined in: packages/octagonal-wheels/src/concurrency/lock.scoped.ts:4

A synchronous or asynchronous operation to execute while holding a lock.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Returns

`Promise`\<`T`\> \| `T`
