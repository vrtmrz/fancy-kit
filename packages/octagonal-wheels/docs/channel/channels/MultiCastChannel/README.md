[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [channel](../../README.md) / [channels](../README.md) / MultiCastChannel

# Abstract Class: MultiCastChannel\<T, U\>

Defined in: packages/octagonal-wheels/src/channel/channels.ts:255

MultiCastChannel: Base class for Pipeline, Switch, and Survey

## Extends

- [`ChannelBase`](../ChannelBase/README.md)

## Extended by

- [`Pipeline`](../Pipeline/README.md)
- [`Switch`](../Switch/README.md)
- [`Survey`](../Survey/README.md)

## Type Parameters

| Type Parameter        |
| --------------------- |
| `T` _extends_ `any`[] |
| `U`                   |

## Constructors

### Constructor

```ts
new MultiCastChannel<T, U>(
   channelName: string,
   transport: ITransport,
prefix: string): MultiCastChannel<T, U>;
```

Defined in: packages/octagonal-wheels/src/channel/channels.ts:306

Constructor for MultiCastChannel

#### Parameters

| Parameter     | Type                                                 | Description                           |
| ------------- | ---------------------------------------------------- | ------------------------------------- |
| `channelName` | `string`                                             | The name of the channel               |
| `transport`   | [`ITransport`](../../transport/ITransport/README.md) | The transport layer for communication |
| `prefix`      | `string`                                             | The prefix for the channel            |

#### Returns

`MultiCastChannel`\<`T`, `U`\>

#### Overrides

[`ChannelBase`](../ChannelBase/README.md).[`constructor`](../ChannelBase/README.md#constructor)

## Properties

| Property                                                    | Modifier    | Type                                                                                 | Default value              | Description                            | Inherited from                                                                                    | Defined in                                            |
| ----------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------ | -------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| <a id="anyadvertisementknown"></a> `anyAdvertisementKnown?` | `protected` | [`PromiseWithResolvers`](../../../promises/PromiseWithResolvers/README.md)\<`void`\> | `undefined`                | -                                      | -                                                                                                 | packages/octagonal-wheels/src/channel/channels.ts:258 |
| <a id="channelname"></a> `channelName`                      | `protected` | `string`                                                                             | `undefined`                | -                                      | [`ChannelBase`](../ChannelBase/README.md).[`channelName`](../ChannelBase/README.md#channelname)   | packages/octagonal-wheels/src/channel/channels.ts:44  |
| <a id="knownsubscribers"></a> `knownSubscribers`            | `protected` | `Set`\<`string`\>                                                                    | `undefined`                | -                                      | -                                                                                                 | packages/octagonal-wheels/src/channel/channels.ts:257 |
| <a id="prefix"></a> `prefix`                                | `protected` | `string`                                                                             | `undefined`                | -                                      | [`ChannelBase`](../ChannelBase/README.md).[`prefix`](../ChannelBase/README.md#prefix)             | packages/octagonal-wheels/src/channel/channels.ts:39  |
| <a id="timeoutms"></a> `timeoutMs`                          | `protected` | `number`                                                                             | `DEFAULT_QUERY_TIMEOUT_MS` | -                                      | [`ChannelBase`](../ChannelBase/README.md).[`timeoutMs`](../ChannelBase/README.md#timeoutms)       | packages/octagonal-wheels/src/channel/channels.ts:37  |
| <a id="transport"></a> `transport`                          | `protected` | [`ITransport`](../../transport/ITransport/README.md)                                 | `undefined`                | transport instance to use (ITransport) | [`ChannelBase`](../ChannelBase/README.md).[`transport`](../ChannelBase/README.md#transport)       | packages/octagonal-wheels/src/channel/channels.ts:54  |
| <a id="unsubscribes"></a> `unsubscribes`                    | `protected` | `Set`\<() => `void`\>                                                                | `undefined`                | -                                      | [`ChannelBase`](../ChannelBase/README.md).[`unsubscribes`](../ChannelBase/README.md#unsubscribes) | packages/octagonal-wheels/src/channel/channels.ts:62  |

## Accessors

### prefixedChannelName

#### Get Signature

```ts
get prefixedChannelName(): string;
```

Defined in: packages/octagonal-wheels/src/channel/channels.ts:41

##### Returns

`string`

#### Inherited from

[`ChannelBase`](../ChannelBase/README.md).[`prefixedChannelName`](../ChannelBase/README.md#prefixedchannelname)

## Methods

### addUnsubscribe()

```ts
protected addUnsubscribe(unsubscribeCallback: () => void, signal?: AbortSignal): void;
```

Defined in: packages/octagonal-wheels/src/channel/channels.ts:74

#### Parameters

| Parameter             | Type          |
| --------------------- | ------------- |
| `unsubscribeCallback` | () => `void`  |
| `signal?`             | `AbortSignal` |

#### Returns

`void`

#### Inherited from

[`ChannelBase`](../ChannelBase/README.md).[`addUnsubscribe`](../ChannelBase/README.md#addunsubscribe)

---

### advertiseSubId()

```ts
protected advertiseSubId(subId: string, id: string): void;
```

Defined in: packages/octagonal-wheels/src/channel/channels.ts:296

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `subId`   | `string` |
| `id`      | `string` |

#### Returns

`void`

---

### close()

```ts
close(): void;
```

Defined in: packages/octagonal-wheels/src/channel/channels.ts:68

Close the channel and clean up resources.
This will unsubscribe all listeners associated with this channel.

#### Returns

`void`

#### Inherited from

[`ChannelBase`](../ChannelBase/README.md).[`close`](../ChannelBase/README.md#close)

---

### invoke()

```ts
abstract invoke(...args: any[]): any;
```

Defined in: packages/octagonal-wheels/src/channel/channels.ts:138

Invoke function(s) via channel with the provided arguments.

#### Parameters

| Parameter | Type    | Description                                     |
| --------- | ------- | ----------------------------------------------- |
| ...`args` | `any`[] | arguments to pass to the registered function(s) |

#### Returns

`any`

a promise that resolves with the result(s) of the invocation

#### Inherited from

[`ChannelBase`](../ChannelBase/README.md).[`invoke`](../ChannelBase/README.md#invoke)

---

### publish()

```ts
protected publish(data: any): void;
```

Defined in: packages/octagonal-wheels/src/channel/channels.ts:116

#### Parameters

| Parameter | Type  |
| --------- | ----- |
| `data`    | `any` |

#### Returns

`void`

#### Inherited from

[`ChannelBase`](../ChannelBase/README.md).[`publish`](../ChannelBase/README.md#publish)

---

### query()

```ts
query<T, U>(args: T, subId?: string): Promise<Awaited<U>>;
```

Defined in: packages/octagonal-wheels/src/channel/channels.ts:121

#### Type Parameters

| Type Parameter        |
| --------------------- |
| `T` _extends_ `any`[] |
| `U`                   |

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `args`    | `T`      |
| `subId?`  | `string` |

#### Returns

`Promise`\<`Awaited`\<`U`\>\>

#### Inherited from

[`ChannelBase`](../ChannelBase/README.md).[`query`](../ChannelBase/README.md#query)

---

### register()

```ts
register(func: ChannelFunc<T, U>, options?: RegisterOptions): () => void;
```

Defined in: packages/octagonal-wheels/src/channel/channels.ts:265

Register a function to handle incoming messages on the MultiCastChannel.

#### Parameters

| Parameter  | Type                                                  | Description                                                   |
| ---------- | ----------------------------------------------------- | ------------------------------------------------------------- |
| `func`     | [`ChannelFunc`](../ChannelFunc/README.md)\<`T`, `U`\> | function to register                                          |
| `options?` | [`RegisterOptions`](../RegisterOptions/README.md)     | optional RegisterOptions, including AbortSignal to unregister |

#### Returns

a function to unregister the handler

() => `void`

#### Overrides

[`ChannelBase`](../ChannelBase/README.md).[`register`](../ChannelBase/README.md#register)

---

### requestAdvertisement()

```ts
requestAdvertisement(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/channel/channels.ts:324

Request advertisement from other instances.

#### Returns

`Promise`\<`void`\>

A promise that resolves when at least one advertisement is known.

---

### respond()

```ts
protected respond(originalMessage: RequestMessage<any>, data: {
  error?: any;
  result?: any;
}): void;
```

Defined in: packages/octagonal-wheels/src/channel/channels.ts:291

#### Parameters

| Parameter         | Type                                     |
| ----------------- | ---------------------------------------- |
| `originalMessage` | `RequestMessage`\<`any`\>                |
| `data`            | \{ `error?`: `any`; `result?`: `any`; \} |
| `data.error?`     | `any`                                    |
| `data.result?`    | `any`                                    |

#### Returns

`void`

#### Overrides

[`ChannelBase`](../ChannelBase/README.md).[`respond`](../ChannelBase/README.md#respond)

---

### subscribe()

```ts
protected subscribe(
   listener: (data: any) => void | Promise<void>,
   signal?: AbortSignal,
   tearDown?: () => void): () => void;
```

Defined in: packages/octagonal-wheels/src/channel/channels.ts:100

#### Parameters

| Parameter   | Type                                             |
| ----------- | ------------------------------------------------ |
| `listener`  | (`data`: `any`) => `void` \| `Promise`\<`void`\> |
| `signal?`   | `AbortSignal`                                    |
| `tearDown?` | () => `void`                                     |

#### Returns

() => `void`

#### Inherited from

[`ChannelBase`](../ChannelBase/README.md).[`subscribe`](../ChannelBase/README.md#subscribe)

---

### waitForAnyAdvertisement()

```ts
waitForAnyAdvertisement(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/channel/channels.ts:337

Wait until at least one advertisement is known.

#### Returns

`Promise`\<`void`\>

A promise that resolves when at least one advertisement is known.
