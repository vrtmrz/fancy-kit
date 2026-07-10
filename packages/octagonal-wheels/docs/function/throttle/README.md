[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [function](../README.md) / throttle

# Function: throttle()

```ts
function throttle<T>(func: T, timeout: number): ThrottledFunction<T>;
```

Defined in: [src/function.ts:12](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/function.ts#L12)

Thinning out the execution of a function by delaying subsequent invocations
until a specified timeout has passed since the last invocation.

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` *extends* (...`args`: `any`[]) => `any` | The type of the function being throttled. |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `func` | `T` | The function to be throttled. |
| `timeout` | `number` | The timeout value in milliseconds. |

## Returns

[`ThrottledFunction`](../ThrottledFunction/README.md)\<`T`\>

A throttled function that delays subsequent invocations.
