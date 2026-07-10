[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [databases](../../README.md) / [dbcommon](../README.md) / SimpleStoreEventCloseParams

# Type Alias: SimpleStoreEventCloseParams

```ts
type SimpleStoreEventCloseParams = {
  reason: string | Error | undefined;
  type: typeof CLOSED;
};
```

Defined in: [src/databases/dbcommon.ts:46](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/dbcommon.ts#L46)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="reason"></a> `reason` | `string` \| `Error` \| `undefined` | [src/databases/dbcommon.ts:48](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/dbcommon.ts#L48) |
| <a id="type"></a> `type` | *typeof* [`CLOSED`](../SIMPLE_STORE_EVENT_TYPES/README.md#closed) | [src/databases/dbcommon.ts:47](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/dbcommon.ts#L47) |
