[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [databases](../../README.md) / [dbcommon](../README.md) / SimpleStoreEventInitialiseParams

# Type Alias: SimpleStoreEventInitialiseParams

```ts
type SimpleStoreEventInitialiseParams = {
  count: number;
  reason: string | Error | undefined;
  type: typeof INITIALISED;
};
```

Defined in: packages/octagonal-wheels/src/databases/dbcommon.ts:54

## Properties

| Property                     | Type                                                                        | Defined in                                             |
| ---------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ |
| <a id="count"></a> `count`   | `number`                                                                    | packages/octagonal-wheels/src/databases/dbcommon.ts:56 |
| <a id="reason"></a> `reason` | `string` \| `Error` \| `undefined`                                          | packages/octagonal-wheels/src/databases/dbcommon.ts:57 |
| <a id="type"></a> `type`     | _typeof_ [`INITIALISED`](../SIMPLE_STORE_EVENT_TYPES/README.md#initialised) | packages/octagonal-wheels/src/databases/dbcommon.ts:55 |
