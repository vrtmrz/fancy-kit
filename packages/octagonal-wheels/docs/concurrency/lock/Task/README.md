[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [lock](../README.md) / Task

# Type Alias: Task()\<T\>

```ts
type Task<T> = () => Promise<T> | T;
```

Defined in: [src/concurrency/lock\_v2.ts:4](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/lock_v2.ts#L4)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Returns

`Promise`\<`T`\> \| `T`
