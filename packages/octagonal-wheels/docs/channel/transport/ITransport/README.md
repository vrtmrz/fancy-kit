[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [channel](../../README.md) / [transport](../README.md) / ITransport

# Interface: ITransport\<T\>

Defined in: [src/channel/transport.ts:8](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/transport.ts#L8)

Transport Interface for Channel Communication

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `T` | `any` |

## Methods

### close()

```ts
close(): void;
```

Defined in: [src/channel/transport.ts:25](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/transport.ts#L25)

Close the transport and clean up resources.

#### Returns

`void`

***

### publish()

```ts
publish(channelName: string, data: T): void;
```

Defined in: [src/channel/transport.ts:21](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/transport.ts#L21)

Publish a message to a specific channel.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `channelName` | `string` | The name of the channel to publish to. |
| `data` | `T` | The data to send with the message. |

#### Returns

`void`

***

### subscribe()

```ts
subscribe(channelName: string, listener: (data: T) => void | Promise<void>): () => void;
```

Defined in: [src/channel/transport.ts:15](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/transport.ts#L15)

Subscribe to messages on a specific channel.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `channelName` | `string` | The name of the channel to subscribe to. |
| `listener` | (`data`: `T`) => `void` \| `Promise`\<`void`\> | The callback function to invoke when a message is received on the channel. |

#### Returns

A function to unsubscribe from the channel.

```ts
(): void;
```

##### Returns

`void`
