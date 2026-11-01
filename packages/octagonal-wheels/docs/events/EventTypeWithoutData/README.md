[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [events](../README.md) / EventTypeWithoutData

# Type Alias: EventTypeWithoutData\<ET, K\>

```ts
type EventTypeWithoutData<ET, K> = K extends keyof ET
  ? ET[K] extends undefined
    ? K extends string
      ? K
      : never
    : never
  : never;
```

Defined in: packages/octagonal-wheels/src/events/EventHub.ts:9

## Type Parameters

| Type Parameter |
| -------------- |
| `ET`           |
| `K`            |
