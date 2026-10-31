[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [databases](../../README.md) / [dbcommon](../README.md) / SimpleStoreEventOpenedParams

# Type Alias: SimpleStoreEventOpenedParams

```ts
type SimpleStoreEventOpenedParams = {
  count: number;
  reason: string | Error | undefined;
  type: typeof INITIALISED;
};
```

Defined in: packages/octagonal-wheels/src/databases/dbcommon.ts:59

## Properties

| Property                     | Type                                                                        | Defined in                                             |
| ---------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ |
| <a id="count"></a> `count`   | `number`                                                                    | packages/octagonal-wheels/src/databases/dbcommon.ts:61 |
| <a id="reason"></a> `reason` | `string` \| `Error` \| `undefined`                                          | packages/octagonal-wheels/src/databases/dbcommon.ts:62 |
| <a id="type"></a> `type`     | _typeof_ [`INITIALISED`](../SIMPLE_STORE_EVENT_TYPES/README.md#initialised) | packages/octagonal-wheels/src/databases/dbcommon.ts:60 |
