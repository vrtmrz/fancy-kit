[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [channel](../../README.md) / [transport](../README.md) / BroadcastChannelTransport

# Class: BroadcastChannelTransport

Defined in: [src/channel/transport.ts:124](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/transport.ts#L124)

Transport Implementation: BroadcastChannel
Used for communication between different browser tabs, windows, iframes, or workers of the same origin.
Messages are serialized and deserialized using the structured clone algorithm.
Do not pass non-cloneable objects (e.g., functions, DOM nodes) through this transport.

## Implements

- [`ITransport`](../ITransport/README.md)

## Constructors

### Constructor

```ts
new BroadcastChannelTransport(enableEcho: boolean): BroadcastChannelTransport;
```

Defined in: [src/channel/transport.ts:131](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/transport.ts#L131)

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `enableEcho` | `boolean` | `true` |

#### Returns

`BroadcastChannelTransport`

## Methods

### close()

```ts
close(): void;
```

Defined in: [src/channel/transport.ts:192](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/transport.ts#L192)

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

Defined in: [src/channel/transport.ts:184](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/transport.ts#L184)

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

Defined in: [src/channel/transport.ts:163](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/transport.ts#L163)

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
