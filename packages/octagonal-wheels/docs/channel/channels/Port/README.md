[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [channel](../../README.md) / [channels](../README.md) / Port

# Class: Port\<T, U\>

Defined in: [src/channel/channels.ts:144](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L144)

Port: Connect 1 to 1 and expect a result

## Extends

- [`ChannelBase`](../ChannelBase/README.md)

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `any`[] |
| `U` |

## Constructors

### Constructor

```ts
new Port<T, U>(channelName: string, transport: ITransport): Port<T, U>;
```

Defined in: [src/channel/channels.ts:202](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L202)

Constructor for Port channel

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `channelName` | `string` | unique name of the channel |
| `transport` | [`ITransport`](../../transport/ITransport/README.md) | transport layer for communication |

#### Returns

`Port`\<`T`, `U`\>

#### Overrides

[`ChannelBase`](../ChannelBase/README.md).[`constructor`](../ChannelBase/README.md#constructor)

## Properties

| Property | Modifier | Type | Default value | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="channelname"></a> `channelName` | `protected` | `string` | `undefined` | - | [`ChannelBase`](../ChannelBase/README.md).[`channelName`](../ChannelBase/README.md#channelname) | [src/channel/channels.ts:44](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L44) |
| <a id="prefix"></a> `prefix` | `protected` | `string` | `undefined` | - | [`ChannelBase`](../ChannelBase/README.md).[`prefix`](../ChannelBase/README.md#prefix) | [src/channel/channels.ts:39](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L39) |
| <a id="timeoutms"></a> `timeoutMs` | `protected` | `number` | `DEFAULT_QUERY_TIMEOUT_MS` | - | [`ChannelBase`](../ChannelBase/README.md).[`timeoutMs`](../ChannelBase/README.md#timeoutms) | [src/channel/channels.ts:37](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L37) |
| <a id="transport"></a> `transport` | `protected` | [`ITransport`](../../transport/ITransport/README.md) | `undefined` | transport instance to use (ITransport) | [`ChannelBase`](../ChannelBase/README.md).[`transport`](../ChannelBase/README.md#transport) | [src/channel/channels.ts:54](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L54) |
| <a id="unsubscribes"></a> `unsubscribes` | `protected` | `Set`\<() => `void`\> | `undefined` | - | [`ChannelBase`](../ChannelBase/README.md).[`unsubscribes`](../ChannelBase/README.md#unsubscribes) | [src/channel/channels.ts:62](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L62) |

## Accessors

### prefixedChannelName

#### Get Signature

```ts
get prefixedChannelName(): string;
```

Defined in: [src/channel/channels.ts:41](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L41)

##### Returns

`string`

#### Inherited from

[`ChannelBase`](../ChannelBase/README.md).[`prefixedChannelName`](../ChannelBase/README.md#prefixedchannelname)

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

#### Inherited from

[`ChannelBase`](../ChannelBase/README.md).[`addUnsubscribe`](../ChannelBase/README.md#addunsubscribe)

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

#### Inherited from

[`ChannelBase`](../ChannelBase/README.md).[`close`](../ChannelBase/README.md#close)

***

### invoke()

```ts
invoke(...args: T): Promise<Awaited<U>>;
```

Defined in: [src/channel/channels.ts:193](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L193)

Invoke the registered function via the Port channel.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| ...`args` | `T` | arguments to pass to the registered function |

#### Returns

`Promise`\<`Awaited`\<`U`\>\>

a promise that resolves with the result of the invocation

#### Overrides

[`ChannelBase`](../ChannelBase/README.md).[`invoke`](../ChannelBase/README.md#invoke)

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

#### Inherited from

[`ChannelBase`](../ChannelBase/README.md).[`publish`](../ChannelBase/README.md#publish)

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

#### Inherited from

[`ChannelBase`](../ChannelBase/README.md).[`query`](../ChannelBase/README.md#query)

***

### register()

```ts
register(func: ChannelFunc<T, U>, options?: RegisterOptions): () => void;
```

Defined in: [src/channel/channels.ts:157](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L157)

Register a function to handle incoming requests on the Port channel.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `func` | [`ChannelFunc`](../ChannelFunc/README.md)\<`T`, `U`\> | function to register |
| `options?` | [`RegisterOptions`](../RegisterOptions/README.md) | optional RegisterOptions, including AbortSignal to unregister |

#### Returns

a function to unregister the handler

```ts
(): void;
```

##### Returns

`void`

#### Overrides

[`ChannelBase`](../ChannelBase/README.md).[`register`](../ChannelBase/README.md#register)

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

#### Inherited from

[`ChannelBase`](../ChannelBase/README.md).[`respond`](../ChannelBase/README.md#respond)

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

#### Inherited from

[`ChannelBase`](../ChannelBase/README.md).[`subscribe`](../ChannelBase/README.md#subscribe)
