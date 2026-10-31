[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [events](../README.md) / EventTypeWithData

# Type Alias: EventTypeWithData\<ET, K\>

```ts
type EventTypeWithData<ET, K> = K extends keyof ET
  ? ET[K] extends undefined
    ? never
    : K extends string
      ? K
      : never
  : never;
```

Defined in: packages/octagonal-wheels/src/events/EventHub.ts:2

## Type Parameters

| Type Parameter |
| -------------- |
| `ET`           |
| `K`            |
