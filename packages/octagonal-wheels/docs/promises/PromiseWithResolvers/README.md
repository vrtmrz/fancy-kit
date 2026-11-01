[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [promises](../README.md) / PromiseWithResolvers

# Type Alias: PromiseWithResolvers\<T\>

```ts
type PromiseWithResolvers<T> = {
  promise: Promise<T>;
  reject: (reason?: any) => void;
  resolve: (value: T | PromiseLike<T>) => void;
};
```

Defined in: packages/octagonal-wheels/src/promises.ts:38

A promise with resolver functions.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Properties

| Property                       | Type                                             | Defined in                                   |
| ------------------------------ | ------------------------------------------------ | -------------------------------------------- |
| <a id="promise"></a> `promise` | `Promise`\<`T`\>                                 | packages/octagonal-wheels/src/promises.ts:39 |
| <a id="reject"></a> `reject`   | (`reason?`: `any`) => `void`                     | packages/octagonal-wheels/src/promises.ts:41 |
| <a id="resolve"></a> `resolve` | (`value`: `T` \| `PromiseLike`\<`T`\>) => `void` | packages/octagonal-wheels/src/promises.ts:40 |
