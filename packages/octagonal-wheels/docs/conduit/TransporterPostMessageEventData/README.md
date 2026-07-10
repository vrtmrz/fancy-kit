[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / TransporterPostMessageEventData

# Type Alias: TransporterPostMessageEventData\<T\>

```ts
type TransporterPostMessageEventData<T> = {
  key: typeof transporterKey;
  payload: T;
  type: string;
};
```

Defined in: [src/conduit/transporterAdapter.ts:22](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L22)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="key"></a> `key` | *typeof* [`transporterKey`](../transporterKey/README.md) | [src/conduit/transporterAdapter.ts:24](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L24) |
| <a id="payload"></a> `payload` | `T` | [src/conduit/transporterAdapter.ts:25](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L25) |
| <a id="type"></a> `type` | `string` | [src/conduit/transporterAdapter.ts:23](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L23) |
