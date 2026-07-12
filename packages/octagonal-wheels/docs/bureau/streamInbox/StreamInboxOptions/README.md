[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [bureau](../../README.md) / [streamInbox](../README.md) / StreamInboxOptions

# Type Alias: StreamInboxOptions

```ts
type StreamInboxOptions = {
  capacity?: number;
  overflowPolicy?: StreamInboxOverflowPolicy;
};
```

Defined in: packages/octagonal-wheels/src/bureau/StreamInbox.ts:3

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="capacity"></a> `capacity?` | `number` | Maximum number of items retained by this bridge, including items already handed to the ReadableStream internal queue. | packages/octagonal-wheels/src/bureau/StreamInbox.ts:8 |
| <a id="overflowpolicy"></a> `overflowPolicy?` | [`StreamInboxOverflowPolicy`](../StreamInboxOverflowPolicy/README.md) | - | packages/octagonal-wheels/src/bureau/StreamInbox.ts:9 |
