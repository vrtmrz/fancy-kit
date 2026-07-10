[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [bulk](../README.md) / BatcherOptions

# Type Alias: BatcherOptions

```ts
type BatcherOptions = {
  batchSize: number;
  capacity?: number;
};
```

Defined in: [src/concurrency/bulk.ts:258](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L258)

Options for Batcher.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="batchsize"></a> `batchSize` | `number` | Number of items to batch before yielding. | [src/concurrency/bulk.ts:262](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L262) |
| <a id="capacity"></a> `capacity?` | `number` | Maximum number of items in the buffer. Defaults to Infinity. | [src/concurrency/bulk.ts:266](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L266) |
