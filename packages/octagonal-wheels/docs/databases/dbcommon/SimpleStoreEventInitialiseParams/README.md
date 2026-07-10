[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [databases](../../README.md) / [dbcommon](../README.md) / SimpleStoreEventInitialiseParams

# Type Alias: SimpleStoreEventInitialiseParams

```ts
type SimpleStoreEventInitialiseParams = {
  count: number;
  reason: string | Error | undefined;
  type: typeof INITIALISED;
};
```

Defined in: [src/databases/dbcommon.ts:54](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/dbcommon.ts#L54)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="count"></a> `count` | `number` | [src/databases/dbcommon.ts:56](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/dbcommon.ts#L56) |
| <a id="reason"></a> `reason` | `string` \| `Error` \| `undefined` | [src/databases/dbcommon.ts:57](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/dbcommon.ts#L57) |
| <a id="type"></a> `type` | *typeof* [`INITIALISED`](../SIMPLE_STORE_EVENT_TYPES/README.md#initialised) | [src/databases/dbcommon.ts:55](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/dbcommon.ts#L55) |
