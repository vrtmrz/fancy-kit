[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [context](../README.md) / bindContext

# Function: bindContext()

```ts
function bindContext<T, U, Context>(ctx: Context, func: (ctx: Context, ...args: T) => U): (...args: T) => U;
```

Defined in: [src/context.ts:11](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/context.ts#L11)

Binds a context object to a function, creating a new function that will invoke the original function with the provided context object.

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` *extends* `any`[] | The type of the arguments of the original function. |
| `U` *extends* `unknown` | The return type of the original function. |
| `Context` | The type of the context object. |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `ctx` | `Context` | The context object to bind to the function. |
| `func` | (`ctx`: `Context`, ...`args`: `T`) => `U` | The function to bind the context to. |

## Returns

A new function that will invoke the original function with the provided context.

```ts
(...args: T): U;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | `T` |

### Returns

`U`
