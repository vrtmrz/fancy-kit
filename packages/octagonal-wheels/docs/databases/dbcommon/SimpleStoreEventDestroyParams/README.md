[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [databases](../../README.md) / [dbcommon](../README.md) / SimpleStoreEventDestroyParams

# Type Alias: SimpleStoreEventDestroyParams

```ts
type SimpleStoreEventDestroyParams = {
  reason: string | Error | undefined;
  type: typeof DESTROYED;
};
```

Defined in: [src/databases/dbcommon.ts:50](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/dbcommon.ts#L50)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="reason"></a> `reason` | `string` \| `Error` \| `undefined` | [src/databases/dbcommon.ts:52](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/dbcommon.ts#L52) |
| <a id="type"></a> `type` | *typeof* [`DESTROYED`](../SIMPLE_STORE_EVENT_TYPES/README.md#destroyed) | [src/databases/dbcommon.ts:51](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/dbcommon.ts#L51) |
