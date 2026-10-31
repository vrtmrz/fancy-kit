[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / TransporterPostMessageEventData

# Type Alias: TransporterPostMessageEventData\<T\>

```ts
type TransporterPostMessageEventData<T> = {
  key: typeof transporterKey;
  payload: T;
  type: string;
};
```

Defined in: packages/octagonal-wheels/src/conduit/transporterAdapter.ts:22

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Properties

| Property                       | Type                                                     | Defined in                                                     |
| ------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------- |
| <a id="key"></a> `key`         | _typeof_ [`transporterKey`](../transporterKey/README.md) | packages/octagonal-wheels/src/conduit/transporterAdapter.ts:24 |
| <a id="payload"></a> `payload` | `T`                                                      | packages/octagonal-wheels/src/conduit/transporterAdapter.ts:25 |
| <a id="type"></a> `type`       | `string`                                                 | packages/octagonal-wheels/src/conduit/transporterAdapter.ts:23 |
