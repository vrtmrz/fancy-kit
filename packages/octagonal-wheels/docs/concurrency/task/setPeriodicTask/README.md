[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [task](../README.md) / setPeriodicTask

# Function: setPeriodicTask()

```ts
function setPeriodicTask(
   key: string, 
   timeout: number, 
   proc: () => void | Promise<any>): void;
```

Defined in: [src/concurrency/task.ts:167](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/task.ts#L167)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |
| `timeout` | `number` |
| `proc` | () => `void` \| `Promise`\<`any`\> |

## Returns

`void`
