[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [channel](../../README.md) / [channels](../README.md) / ChannelBase

# Abstract Class: ChannelBase

Defined in: [src/channel/channels.ts:35](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L35)

Base class for channel types

## Extended by

- [`Port`](../Port/README.md)
- [`Broadcaster`](../Broadcaster/README.md)
- [`MultiCastChannel`](../MultiCastChannel/README.md)

## Constructors

### Constructor

```ts
new ChannelBase(
   channelName: string, 
   transport: ITransport, 
   prefix: string): ChannelBase;
```

Defined in: [src/channel/channels.ts:52](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L52)

Base Class for Channels

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `channelName` | `string` | unique name of the channel |
| `transport` | [`ITransport`](../../transport/ITransport/README.md) | transport instance to use (ITransport) |
| `prefix` | `string` | prefix for the channel type (e.g., "port:", "broadcaster:", etc). We should set this via subclass constructor. |

#### Returns

`ChannelBase`

## Properties

| Property | Modifier | Type | Default value | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="channelname"></a> `channelName` | `protected` | `string` | `undefined` | - | [src/channel/channels.ts:44](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L44) |
| <a id="prefix"></a> `prefix` | `protected` | `string` | `undefined` | - | [src/channel/channels.ts:39](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L39) |
| <a id="timeoutms"></a> `timeoutMs` | `protected` | `number` | `DEFAULT_QUERY_TIMEOUT_MS` | - | [src/channel/channels.ts:37](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L37) |
| <a id="transport"></a> `transport` | `protected` | [`ITransport`](../../transport/ITransport/README.md) | `undefined` | transport instance to use (ITransport) | [src/channel/channels.ts:54](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L54) |
| <a id="unsubscribes"></a> `unsubscribes` | `protected` | `Set`\<() => `void`\> | `undefined` | - | [src/channel/channels.ts:62](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L62) |

## Accessors

### prefixedChannelName

#### Get Signature

```ts
get prefixedChannelName(): string;
```

Defined in: [src/channel/channels.ts:41](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L41)

##### Returns

`string`

## Methods

### addUnsubscribe()

```ts
protected addUnsubscribe(unsubscribeCallback: () => void, signal?: AbortSignal): void;
```

Defined in: [src/channel/channels.ts:74](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L74)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `unsubscribeCallback` | () => `void` |
| `signal?` | `AbortSignal` |

#### Returns

`void`

***

### close()

```ts
close(): void;
```

Defined in: [src/channel/channels.ts:68](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L68)

Close the channel and clean up resources.
This will unsubscribe all listeners associated with this channel.

#### Returns

`void`

***

### invoke()

```ts
abstract invoke(...args: any[]): any;
```

Defined in: [src/channel/channels.ts:138](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L138)

Invoke function(s) via channel with the provided arguments.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| ...`args` | `any`[] | arguments to pass to the registered function(s) |

#### Returns

`any`

a promise that resolves with the result(s) of the invocation

***

### publish()

```ts
protected publish(data: any): void;
```

Defined in: [src/channel/channels.ts:116](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L116)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | `any` |

#### Returns

`void`

***

### query()

```ts
query<T, U>(args: T, subId?: string): Promise<Awaited<U>>;
```

Defined in: [src/channel/channels.ts:121](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L121)

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `any`[] |
| `U` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `args` | `T` |
| `subId?` | `string` |

#### Returns

`Promise`\<`Awaited`\<`U`\>\>

***

### register()

```ts
abstract register(func: ChannelFunc<any, any>, options?: RegisterOptions): () => void;
```

Defined in: [src/channel/channels.ts:131](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L131)

Register a function to handle incoming requests on the channel.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `func` | [`ChannelFunc`](../ChannelFunc/README.md)\<`any`, `any`\> | async function to handle requests |
| `options?` | [`RegisterOptions`](../RegisterOptions/README.md) | optional RegisterOptions, including AbortSignal to unregister |

#### Returns

a function to unregister the handler

```ts
(): void;
```

##### Returns

`void`

***

### respond()

```ts
protected respond(
   OriginalMessage: RequestMessage<any>, 
   data: {
  error?: any;
  result?: any;
}, 
   extra: any): void;
```

Defined in: [src/channel/channels.ts:89](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L89)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `OriginalMessage` | `RequestMessage`\<`any`\> |
| `data` | \{ `error?`: `any`; `result?`: `any`; \} |
| `data.error?` | `any` |
| `data.result?` | `any` |
| `extra` | `any` |

#### Returns

`void`

***

### subscribe()

```ts
protected subscribe(
   listener: (data: any) => void | Promise<void>, 
   signal?: AbortSignal, 
   tearDown?: () => void): () => void;
```

Defined in: [src/channel/channels.ts:100](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L100)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `listener` | (`data`: `any`) => `void` \| `Promise`\<`void`\> |
| `signal?` | `AbortSignal` |
| `tearDown?` | () => `void` |

#### Returns

```ts
(): void;
```

##### Returns

`void`
