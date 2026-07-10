[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [channel](../../README.md) / [channels](../README.md) / Survey

# Class: Survey\<T, U\>

Defined in: [src/channel/channels.ts:425](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L425)

Survey: Connect many to many and expect all to respond, collecting all results.
The invocation returns an array of promises, each resolving to the result of a handler.
Be aware that the results may arrive in any order, depending on the response times of the handlers (Designed for parallelism).

## Extends

- [`MultiCastChannel`](../MultiCastChannel/README.md)\<`T`, `Promise`\<`Awaited`\<`U`\>\>\>

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `any`[] |
| `U` |

## Constructors

### Constructor

```ts
new Survey<T, U>(channelName: string, transport: ITransport): Survey<T, U>;
```

Defined in: [src/channel/channels.ts:431](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L431)

Constructor for Survey channel

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `channelName` | `string` | unique name of the channel |
| `transport` | [`ITransport`](../../transport/ITransport/README.md) | The transport layer for communication |

#### Returns

`Survey`\<`T`, `U`\>

#### Overrides

[`MultiCastChannel`](../MultiCastChannel/README.md).[`constructor`](../MultiCastChannel/README.md#constructor)

## Properties

| Property | Modifier | Type | Default value | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="anyadvertisementknown"></a> `anyAdvertisementKnown?` | `protected` | [`PromiseWithResolvers`](../../../promises/PromiseWithResolvers/README.md)\<`void`\> | `undefined` | - | [`MultiCastChannel`](../MultiCastChannel/README.md).[`anyAdvertisementKnown`](../MultiCastChannel/README.md#anyadvertisementknown) | [src/channel/channels.ts:258](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L258) |
| <a id="channelname"></a> `channelName` | `protected` | `string` | `undefined` | - | [`MultiCastChannel`](../MultiCastChannel/README.md).[`channelName`](../MultiCastChannel/README.md#channelname) | [src/channel/channels.ts:44](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L44) |
| <a id="knownsubscribers"></a> `knownSubscribers` | `protected` | `Set`\<`string`\> | `undefined` | - | [`MultiCastChannel`](../MultiCastChannel/README.md).[`knownSubscribers`](../MultiCastChannel/README.md#knownsubscribers) | [src/channel/channels.ts:257](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L257) |
| <a id="prefix"></a> `prefix` | `protected` | `string` | `undefined` | - | [`MultiCastChannel`](../MultiCastChannel/README.md).[`prefix`](../MultiCastChannel/README.md#prefix) | [src/channel/channels.ts:39](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L39) |
| <a id="timeoutms"></a> `timeoutMs` | `protected` | `number` | `DEFAULT_QUERY_TIMEOUT_MS` | - | [`MultiCastChannel`](../MultiCastChannel/README.md).[`timeoutMs`](../MultiCastChannel/README.md#timeoutms) | [src/channel/channels.ts:37](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L37) |
| <a id="transport"></a> `transport` | `protected` | [`ITransport`](../../transport/ITransport/README.md) | `undefined` | transport instance to use (ITransport) | [`MultiCastChannel`](../MultiCastChannel/README.md).[`transport`](../MultiCastChannel/README.md#transport) | [src/channel/channels.ts:54](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L54) |
| <a id="unsubscribes"></a> `unsubscribes` | `protected` | `Set`\<() => `void`\> | `undefined` | - | [`MultiCastChannel`](../MultiCastChannel/README.md).[`unsubscribes`](../MultiCastChannel/README.md#unsubscribes) | [src/channel/channels.ts:62](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L62) |

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

[`MultiCastChannel`](../MultiCastChannel/README.md).[`prefixedChannelName`](../MultiCastChannel/README.md#prefixedchannelname)

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

[`MultiCastChannel`](../MultiCastChannel/README.md).[`addUnsubscribe`](../MultiCastChannel/README.md#addunsubscribe)

***

### advertiseSubId()

```ts
protected advertiseSubId(subId: string, id: string): void;
```

Defined in: [src/channel/channels.ts:296](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L296)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `subId` | `string` |
| `id` | `string` |

#### Returns

`void`

#### Inherited from

[`MultiCastChannel`](../MultiCastChannel/README.md).[`advertiseSubId`](../MultiCastChannel/README.md#advertisesubid)

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

[`MultiCastChannel`](../MultiCastChannel/README.md).[`close`](../MultiCastChannel/README.md#close)

***

### invoke()

```ts
invoke(...args: T): Promise<Awaited<U>>[];
```

Defined in: [src/channel/channels.ts:440](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L440)

Invoke all registered handlers and collect their results.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| ...`args` | `T` | arguments to pass to the registered functions |

#### Returns

`Promise`\<`Awaited`\<`U`\>\>[]

a promise that resolves with an array of results from all handlers

#### Overrides

[`MultiCastChannel`](../MultiCastChannel/README.md).[`invoke`](../MultiCastChannel/README.md#invoke)

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

[`MultiCastChannel`](../MultiCastChannel/README.md).[`publish`](../MultiCastChannel/README.md#publish)

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

[`MultiCastChannel`](../MultiCastChannel/README.md).[`query`](../MultiCastChannel/README.md#query)

***

### register()

```ts
register(func: ChannelFunc<T, Promise<Awaited<U>>>, options?: RegisterOptions): () => void;
```

Defined in: [src/channel/channels.ts:265](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L265)

Register a function to handle incoming messages on the MultiCastChannel.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `func` | [`ChannelFunc`](../ChannelFunc/README.md)\<`T`, `Promise`\<`Awaited`\<`U`\>\>\> | function to register |
| `options?` | [`RegisterOptions`](../RegisterOptions/README.md) | optional RegisterOptions, including AbortSignal to unregister |

#### Returns

a function to unregister the handler

```ts
(): void;
```

##### Returns

`void`

#### Inherited from

[`MultiCastChannel`](../MultiCastChannel/README.md).[`register`](../MultiCastChannel/README.md#register)

***

### requestAdvertisement()

```ts
requestAdvertisement(): Promise<void>;
```

Defined in: [src/channel/channels.ts:324](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L324)

Request advertisement from other instances.

#### Returns

`Promise`\<`void`\>

A promise that resolves when at least one advertisement is known.

#### Inherited from

[`MultiCastChannel`](../MultiCastChannel/README.md).[`requestAdvertisement`](../MultiCastChannel/README.md#requestadvertisement)

***

### respond()

```ts
protected respond(originalMessage: RequestMessage<any>, data: {
  error?: any;
  result?: any;
}): void;
```

Defined in: [src/channel/channels.ts:291](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L291)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `originalMessage` | `RequestMessage`\<`any`\> |
| `data` | \{ `error?`: `any`; `result?`: `any`; \} |
| `data.error?` | `any` |
| `data.result?` | `any` |

#### Returns

`void`

#### Inherited from

[`MultiCastChannel`](../MultiCastChannel/README.md).[`respond`](../MultiCastChannel/README.md#respond)

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

[`MultiCastChannel`](../MultiCastChannel/README.md).[`subscribe`](../MultiCastChannel/README.md#subscribe)

***

### waitForAnyAdvertisement()

```ts
waitForAnyAdvertisement(): Promise<void>;
```

Defined in: [src/channel/channels.ts:337](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L337)

Wait until at least one advertisement is known.

#### Returns

`Promise`\<`void`\>

A promise that resolves when at least one advertisement is known.

#### Inherited from

[`MultiCastChannel`](../MultiCastChannel/README.md).[`waitForAnyAdvertisement`](../MultiCastChannel/README.md#waitforanyadvertisement)
