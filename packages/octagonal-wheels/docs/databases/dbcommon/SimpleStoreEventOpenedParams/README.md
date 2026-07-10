[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [databases](../../README.md) / [dbcommon](../README.md) / SimpleStoreEventOpenedParams

# Type Alias: SimpleStoreEventOpenedParams

```ts
type SimpleStoreEventOpenedParams = {
  count: number;
  reason: string | Error | undefined;
  type: typeof INITIALISED;
};
```

Defined in: [src/databases/dbcommon.ts:59](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/dbcommon.ts#L59)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="count"></a> `count` | `number` | [src/databases/dbcommon.ts:61](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/dbcommon.ts#L61) |
| <a id="reason"></a> `reason` | `string` \| `Error` \| `undefined` | [src/databases/dbcommon.ts:62](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/dbcommon.ts#L62) |
| <a id="type"></a> `type` | *typeof* [`INITIALISED`](../SIMPLE_STORE_EVENT_TYPES/README.md#initialised) | [src/databases/dbcommon.ts:60](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/dbcommon.ts#L60) |
