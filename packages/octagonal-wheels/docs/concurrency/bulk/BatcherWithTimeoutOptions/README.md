[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [bulk](../README.md) / BatcherWithTimeoutOptions

# Type Alias: BatcherWithTimeoutOptions

```ts
type BatcherWithTimeoutOptions = BatcherOptions & {
  timeoutFromLastAdd?: number;
  timeoutFromLastYield?: number;
};
```

Defined in: [src/concurrency/bulk.ts:305](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L305)

Options for BatcherWithTimeout.

## Type Declaration

### timeoutFromLastAdd?

```ts
optional timeoutFromLastAdd: number;
```

Timeout in milliseconds from the last add to force yielding the current batch.

### timeoutFromLastYield?

```ts
optional timeoutFromLastYield: number;
```

Timeout in milliseconds from the last yield to force yielding the current batch.
