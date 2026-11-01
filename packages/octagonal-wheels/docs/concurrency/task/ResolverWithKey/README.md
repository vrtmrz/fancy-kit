[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [task](../README.md) / ResolverWithKey

# Type Alias: ResolverWithKey\<T\>

```ts
type ResolverWithKey<T> = {
  key: string;
  resolver: PromiseWithResolvers<T>;
};
```

Defined in: packages/octagonal-wheels/src/concurrency/task.ts:209

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Properties

| Property                         | Type                                                                              | Defined in                                            |
| -------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------- |
| <a id="key"></a> `key`           | `string`                                                                          | packages/octagonal-wheels/src/concurrency/task.ts:209 |
| <a id="resolver"></a> `resolver` | [`PromiseWithResolvers`](../../../promises/PromiseWithResolvers/README.md)\<`T`\> | packages/octagonal-wheels/src/concurrency/task.ts:209 |
