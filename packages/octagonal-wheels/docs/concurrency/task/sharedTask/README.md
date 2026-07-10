[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [task](../README.md) / sharedTask

# ~~Function: sharedTask()~~

```ts
function sharedTask<T>(key: string, proc: () => Promise<T>): Promise<T>;
```

Defined in: [src/concurrency/task.ts:218](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/task.ts#L218)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` |  |
| `proc` | () => `Promise`\<`T`\> |  |

## Returns

`Promise`\<`T`\>

## Deprecated

Use shareRunningResult instead.
