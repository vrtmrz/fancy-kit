[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [databases](../../README.md) / [dbcommon](../README.md) / SimpleStoreEventDestroyParams

# Type Alias: SimpleStoreEventDestroyParams

```ts
type SimpleStoreEventDestroyParams = {
  reason: string | Error | undefined;
  type: typeof DESTROYED;
};
```

Defined in: packages/octagonal-wheels/src/databases/dbcommon.ts:50

## Properties

| Property                     | Type                                                                    | Defined in                                             |
| ---------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| <a id="reason"></a> `reason` | `string` \| `Error` \| `undefined`                                      | packages/octagonal-wheels/src/databases/dbcommon.ts:52 |
| <a id="type"></a> `type`     | _typeof_ [`DESTROYED`](../SIMPLE_STORE_EVENT_TYPES/README.md#destroyed) | packages/octagonal-wheels/src/databases/dbcommon.ts:51 |
