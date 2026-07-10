[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [task](../README.md) / ResolverWithKey

# Type Alias: ResolverWithKey\<T\>

```ts
type ResolverWithKey<T> = {
  key: string;
  resolver: PromiseWithResolvers<T>;
};
```

Defined in: [src/concurrency/task.ts:209](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/task.ts#L209)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="key"></a> `key` | `string` | [src/concurrency/task.ts:209](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/task.ts#L209) |
| <a id="resolver"></a> `resolver` | [`PromiseWithResolvers`](../../../promises/PromiseWithResolvers/README.md)\<`T`\> | [src/concurrency/task.ts:209](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/task.ts#L209) |
