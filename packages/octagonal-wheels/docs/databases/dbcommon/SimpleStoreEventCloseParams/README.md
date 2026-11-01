[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [databases](../../README.md) / [dbcommon](../README.md) / SimpleStoreEventCloseParams

# Type Alias: SimpleStoreEventCloseParams

```ts
type SimpleStoreEventCloseParams = {
  reason: string | Error | undefined;
  type: typeof CLOSED;
};
```

Defined in: packages/octagonal-wheels/src/databases/dbcommon.ts:46

## Properties

| Property                     | Type                                                              | Defined in                                             |
| ---------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------ |
| <a id="reason"></a> `reason` | `string` \| `Error` \| `undefined`                                | packages/octagonal-wheels/src/databases/dbcommon.ts:48 |
| <a id="type"></a> `type`     | _typeof_ [`CLOSED`](../SIMPLE_STORE_EVENT_TYPES/README.md#closed) | packages/octagonal-wheels/src/databases/dbcommon.ts:47 |
