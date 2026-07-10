[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [task](../README.md) / pipeArrayToGenerator

# Function: pipeArrayToGenerator()

```ts
function pipeArrayToGenerator<T, U>(array: T[], callback: (obj: T) => Promise<U>): Generator<TaskWaiting<U>>;
```

Defined in: [src/concurrency/task.ts:85](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/task.ts#L85)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
| `U` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `array` | `T`[] |
| `callback` | (`obj`: `T`) => `Promise`\<`U`\> |

## Returns

`Generator`\<[`TaskWaiting`](../TaskWaiting/README.md)\<`U`\>\>
