[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [promises](../README.md) / polyfillPromiseWithResolvers

# Function: polyfillPromiseWithResolvers()

```ts
function polyfillPromiseWithResolvers<T>(): PromiseWithResolvers<T>;
```

Defined in: [src/promises.ts:49](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L49)

Creates a promise and returns it along with the resolve and reject functions.

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of the promise value. |

## Returns

[`PromiseWithResolvers`](../PromiseWithResolvers/README.md)\<`T`\>

An object containing the promise, resolve, and reject functions.
