[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [databases](../../README.md) / [simplestorebase](../README.md) / SimpleStoreTransaction

# Type Alias: SimpleStoreTransaction\<T\>

```ts
type SimpleStoreTransaction<T> = SimpleStoreCRUD<T> & {
  abort: void;
  commit: void;
};
```

Defined in: packages/octagonal-wheels/src/databases/SimpleStoreBase.ts:40

## Type Declaration

### abort()

```ts
abort(): void;
```

Aborts the transaction.

#### Returns

`void`

### commit()

```ts
commit(): void;
```

Commits the transaction.

#### Returns

`void`

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |
