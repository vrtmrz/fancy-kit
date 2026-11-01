[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [events](../README.md) / EventDataType

# Type Alias: EventDataType\<ET, K\>

```ts
type EventDataType<ET, K> = ET[K] extends undefined ? undefined : ET[K];
```

Defined in: packages/octagonal-wheels/src/events/EventHub.ts:18

## Type Parameters

| Type Parameter                             |
| ------------------------------------------ |
| `ET` _extends_ `Record`\<`string`, `any`\> |
| `K` _extends_ keyof `ET`                   |
