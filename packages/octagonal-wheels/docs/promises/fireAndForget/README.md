[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [promises](../README.md) / fireAndForget

# Function: fireAndForget()

```ts
function fireAndForget(p: Promise<any> | () => Promise<any>): void;
```

Defined in: [src/promises.ts:97](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L97)

Executes a promise or a function that returns a promise and ignores any errors or results.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `p` | `Promise`\<`any`\> \| () => `Promise`\<`any`\> | The promise or function that returns a promise to be executed. |

## Returns

`void`
