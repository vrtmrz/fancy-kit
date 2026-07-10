[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [channel](../../README.md) / [transport](../README.md) / DirectTransport

# Class: DirectTransport

Defined in: [src/channel/transport.ts:80](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/transport.ts#L80)

Transport Implementation: Direct Function Call
Used for communication within the same JavaScript process (e.g., main thread).
No serialization or deserialization is performed, and messages are delivered immediately.

## Implements

- [`ITransport`](../ITransport/README.md)

## Constructors

### Constructor

```ts
new DirectTransport(): DirectTransport;
```

#### Returns

`DirectTransport`

## Methods

### close()

```ts
close(): void;
```

Defined in: [src/channel/transport.ts:113](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/transport.ts#L113)

Close the transport and clean up resources.

#### Returns

`void`

#### Implementation of

[`ITransport`](../ITransport/README.md).[`close`](../ITransport/README.md#close)

***

### publish()

```ts
publish(channelName: string, data: any): void;
```

Defined in: [src/channel/transport.ts:98](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/transport.ts#L98)

Publish a message to a specific channel.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `channelName` | `string` | The name of the channel to publish to. |
| `data` | `any` | The data to send with the message. |

#### Returns

`void`

#### Implementation of

[`ITransport`](../ITransport/README.md).[`publish`](../ITransport/README.md#publish)

***

### subscribe()

```ts
subscribe(channelName: string, listener: (data: any) => void): () => void;
```

Defined in: [src/channel/transport.ts:83](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/transport.ts#L83)

Subscribe to messages on a specific channel.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `channelName` | `string` | The name of the channel to subscribe to. |
| `listener` | (`data`: `any`) => `void` | The callback function to invoke when a message is received on the channel. |

#### Returns

A function to unsubscribe from the channel.

```ts
(): void;
```

##### Returns

`void`

#### Implementation of

[`ITransport`](../ITransport/README.md).[`subscribe`](../ITransport/README.md#subscribe)
