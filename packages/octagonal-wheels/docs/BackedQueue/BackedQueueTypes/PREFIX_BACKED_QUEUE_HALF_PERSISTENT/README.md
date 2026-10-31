[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [BackedQueue](../../README.md) / [BackedQueueTypes](../README.md) / PREFIX\_BACKED\_QUEUE\_HALF\_PERSISTENT

# Variable: PREFIX\_BACKED\_QUEUE\_HALF\_PERSISTENT

```ts
const PREFIX_BACKED_QUEUE_HALF_PERSISTENT: "bq-h" = "bq-h";
```

Defined in: packages/octagonal-wheels/src/BackedQueue/BackedQueueTypes.ts:143

Prefix for half-persistent backed queue keys.
Used in HalfPersistentIDBackedQueue.
Values with this prefix are volatile and may be changed.
Storage consumption may increase if careless changes are made without migration.
