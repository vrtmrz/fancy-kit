[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [promises](../README.md) / promiseWithResolver

# ~~Variable: promiseWithResolver()~~

```ts
const promiseWithResolver: <T>() => {
  promise: Promise<T>;
  reject: (reason?: any) => void;
  resolve: (value: T | PromiseLike<T>) => void;
} = polyfilledFunc;
```

Defined in: [src/promises.ts:84](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L84)

Creates a promise with custom resolvers. This is kept for compatibility with older code.

Creates a native promise with resolvers. This function is used when the `Promise.withResolvers` function is available.

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of the promise value. |

## Returns

```ts
{
  promise: Promise<T>;
  reject: (reason?: any) => void;
  resolve: (value: T | PromiseLike<T>) => void;
}
```

An object containing the promise, resolve function, and reject function.

### ~~promise~~

```ts
promise: Promise<T>;
```

### ~~reject()~~

```ts
reject: (reason?: any) => void;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `reason?` | `any` |

#### Returns

`void`

### ~~resolve()~~

```ts
resolve: (value: T | PromiseLike<T>) => void;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `T` \| `PromiseLike`\<`T`\> |

#### Returns

`void`

## Deprecated

Use `promiseWithResolvers` instead. (Wrong name)
