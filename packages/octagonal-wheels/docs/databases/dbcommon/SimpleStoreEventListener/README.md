[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [databases](../../README.md) / [dbcommon](../README.md) / SimpleStoreEventListener

# Type Alias: SimpleStoreEventListener

```ts
type SimpleStoreEventListener =
  | ((ev: SimpleStoreClosedEvent) => void)
  | ((ev: SimpleStoreDestroyedEvent) => void)
  | ((ev: SimpleStoreInitialisedEvent) => void)
  | ((ev: SimpleStoreOpenedEvent) => void);
```

Defined in: packages/octagonal-wheels/src/databases/dbcommon.ts:82
