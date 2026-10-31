[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [promises](../README.md) / nativePromiseWithResolvers

# Function: nativePromiseWithResolvers()

```ts
function nativePromiseWithResolvers<T>(): {
  promise: Promise<T>;
  reject: (reason?: any) => void;
  resolve: (value: T | PromiseLike<T>) => void;
};
```

Defined in: packages/octagonal-wheels/src/promises.ts:64

Creates a native promise with resolvers. This function is used when the `Promise.withResolvers` function is available.

## Type Parameters

| Type Parameter | Description                    |
| -------------- | ------------------------------ |
| `T`            | The type of the promise value. |

## Returns

```ts
{
  promise: Promise<T>;
  reject: (reason?: any) => void;
  resolve: (value: T | PromiseLike<T>) => void;
}
```

An object containing the promise, resolve function, and reject function.

### promise

```ts
promise: Promise<T>;
```

### reject

```ts
reject: (reason?: any) => void;
```

#### Parameters

| Parameter | Type  |
| --------- | ----- |
| `reason?` | `any` |

#### Returns

`void`

### resolve

```ts
resolve: (value: T | PromiseLike<T>) => void;
```

#### Parameters

| Parameter | Type                        |
| --------- | --------------------------- |
| `value`   | `T` \| `PromiseLike`\<`T`\> |

#### Returns

`void`
