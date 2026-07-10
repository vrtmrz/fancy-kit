[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [task](../README.md) / scheduleTask

# Function: scheduleTask()

```ts
function scheduleTask(
   key: string, 
   timeout: number, 
   proc: () => void | Promise<any>, 
   skipIfTaskExist?: boolean): void;
```

Defined in: [src/concurrency/task.ts:143](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/task.ts#L143)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |
| `timeout` | `number` |
| `proc` | () => `void` \| `Promise`\<`any`\> |
| `skipIfTaskExist?` | `boolean` |

## Returns

`void`
