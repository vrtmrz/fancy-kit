[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [events](../README.md) / EventTypeWithoutData

# Type Alias: EventTypeWithoutData\<ET, K\>

```ts
type EventTypeWithoutData<ET, K> = K extends keyof ET ? ET[K] extends undefined ? K extends string ? K : never : never : never;
```

Defined in: [src/events/EventHub.ts:9](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/events/EventHub.ts#L9)

## Type Parameters

| Type Parameter |
| ------ |
| `ET` |
| `K` |
