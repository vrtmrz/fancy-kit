[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [events](../README.md) / EventTypeWithData

# Type Alias: EventTypeWithData\<ET, K\>

```ts
type EventTypeWithData<ET, K> = K extends keyof ET ? ET[K] extends undefined ? never : K extends string ? K : never : never;
```

Defined in: [src/events/EventHub.ts:2](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/events/EventHub.ts#L2)

## Type Parameters

| Type Parameter |
| ------ |
| `ET` |
| `K` |
