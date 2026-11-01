[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [bulk](../README.md) / BatcherOptions

# Type Alias: BatcherOptions

```ts
type BatcherOptions = {
  batchSize: number;
  capacity?: number;
};
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:258

Options for Batcher.

## Properties

| Property                           | Type     | Description                                                  | Defined in                                            |
| ---------------------------------- | -------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| <a id="batchsize"></a> `batchSize` | `number` | Number of items to batch before yielding.                    | packages/octagonal-wheels/src/concurrency/bulk.ts:262 |
| <a id="capacity"></a> `capacity?`  | `number` | Maximum number of items in the buffer. Defaults to Infinity. | packages/octagonal-wheels/src/concurrency/bulk.ts:266 |
