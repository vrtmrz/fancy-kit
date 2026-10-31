[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [context](../README.md) / bindContext

# Function: bindContext()

```ts
function bindContext<T, U, Context>(
  ctx: Context,
  func: (ctx: Context, ...args: T) => U,
): (...args: T) => U;
```

Defined in: packages/octagonal-wheels/src/context.ts:11

Binds a context object to a function, creating a new function that will invoke the original function with the provided context object.

## Type Parameters

| Type Parameter          | Description                                         |
| ----------------------- | --------------------------------------------------- |
| `T` _extends_ `any`[]   | The type of the arguments of the original function. |
| `U` _extends_ `unknown` | The return type of the original function.           |
| `Context`               | The type of the context object.                     |

## Parameters

| Parameter | Type                                      | Description                                 |
| --------- | ----------------------------------------- | ------------------------------------------- |
| `ctx`     | `Context`                                 | The context object to bind to the function. |
| `func`    | (`ctx`: `Context`, ...`args`: `T`) => `U` | The function to bind the context to.        |

## Returns

A new function that will invoke the original function with the provided context.

(...`args`: `T`) => `U`
