[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [context](../README.md) / bindContextFunc

# Function: bindContextFunc()

```ts
function bindContextFunc<T, U, Context>(ctxFun: () => Context, func: (ctx: Context, ...args: T) => U): (...args: T) => U;
```

Defined in: [src/context.ts:29](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/context.ts#L29)

Binds a context retrieving function to a given function.

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` *extends* `any`[] | The type of the arguments passed to the function. |
| `U` | The return type of the function. |
| `Context` | The type of the context. |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `ctxFun` | () => `Context` | The context function. |
| `func` | (`ctx`: `Context`, ...`args`: `T`) => `U` | The function to bind the context to. |

## Returns

A new function that calls the original function with the bound context.

```ts
(...args: T): U;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | `T` |

### Returns

`U`
