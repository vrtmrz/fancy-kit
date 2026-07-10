[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [events](../README.md) / EventDataType

# Type Alias: EventDataType\<ET, K\>

```ts
type EventDataType<ET, K> = ET[K] extends undefined ? undefined : ET[K];
```

Defined in: [src/events/EventHub.ts:18](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/events/EventHub.ts#L18)

## Type Parameters

| Type Parameter |
| ------ |
| `ET` *extends* `Record`\<`string`, `any`\> |
| `K` *extends* keyof `ET` |
