[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [databases](../../README.md) / [dbcommon](../README.md) / SimpleStoreEventListener

# Type Alias: SimpleStoreEventListener

```ts
type SimpleStoreEventListener = 
  | (ev: SimpleStoreClosedEvent) => void
  | (ev: SimpleStoreDestroyedEvent) => void
  | (ev: SimpleStoreInitialisedEvent) => void
  | (ev: SimpleStoreOpenedEvent) => void;
```

Defined in: [src/databases/dbcommon.ts:82](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/dbcommon.ts#L82)
