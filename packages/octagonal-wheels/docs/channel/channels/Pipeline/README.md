[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [channel](../../README.md) / [channels](../README.md) / Pipeline

# Class: Pipeline\<T\>

Defined in: packages/octagonal-wheels/src/channel/channels.ts:354

Pipeline: Connect many to many and expect all to respond true, short-circuiting on first false or error.
If any handler returns false or throws an error, the invocation returns false immediately.
If all handlers return true, the invocation returns true.

## Extends

- [`MultiCastChannel`](../MultiCastChannel/README.md)\<`T`, `boolean`\>

## Type Parameters

| Type Parameter        |
| --------------------- |
| `T` _extends_ `any`[] |

## Constructors

### Constructor

```ts
new Pipeline<T>(channelName: string, transport: ITransport): Pipeline<T>;
```

Defined in: packages/octagonal-wheels/src/channel/channels.ts:360

Constructor for Pipeline channel

#### Parameters

| Parameter     | Type                                                 | Description                           |
| ------------- | ---------------------------------------------------- | ------------------------------------- |
| `channelName` | `string`                                             | unique name of the channel            |
| `transport`   | [`ITransport`](../../transport/ITransport/README.md) | The transport layer for communication |

#### Returns

`Pipeline`\<`T`\>

#### Overrides

[`MultiCastChannel`](../MultiCastChannel/README.md).[`constructor`](../MultiCastChannel/README.md#constructor)

## Properties

| Property                                                    | Modifier    | Type                                                                                 | Default value              | Description                            | Inherited from                                                                                                                     | Defined in                                            |
| ----------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------ | -------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| <a id="anyadvertisementknown"></a> `anyAdvertisementKnown?` | `protected` | [`PromiseWithResolvers`](../../../promises/PromiseWithResolvers/README.md)\<`void`\> | `undefined`                | -                                      | [`MultiCastChannel`](../MultiCastChannel/README.md).[`anyAdvertisementKnown`](../MultiCastChannel/README.md#anyadvertisementknown) | packages/octagonal-wheels/src/channel/channels.ts:258 |
| <a id="channelname"></a> `channelName`                      | `protected` | `string`                                                                             | `undefined`                | -                                      | [`MultiCastChannel`](../MultiCastChannel/README.md).[`channelName`](../MultiCastChannel/README.md#channelname)                     | packages/octagonal-wheels/src/channel/channels.ts:44  |
| <a id="knownsubscribers"></a> `knownSubscribers`            | `protected` | `Set`\<`string`\>                                                                    | `undefined`                | -                                      | [`MultiCastChannel`](../MultiCastChannel/README.md).[`knownSubscribers`](../MultiCastChannel/README.md#knownsubscribers)           | packages/octagonal-wheels/src/channel/channels.ts:257 |
| <a id="prefix"></a> `prefix`                                | `protected` | `string`                                                                             | `undefined`                | -                                      | [`MultiCastChannel`](../MultiCastChannel/README.md).[`prefix`](../MultiCastChannel/README.md#prefix)                               | packages/octagonal-wheels/src/channel/channels.ts:39  |
| <a id="timeoutms"></a> `timeoutMs`                          | `protected` | `number`                                                                             | `DEFAULT_QUERY_TIMEOUT_MS` | -                                      | [`MultiCastChannel`](../MultiCastChannel/README.md).[`timeoutMs`](../MultiCastChannel/README.md#timeoutms)                         | packages/octagonal-wheels/src/channel/channels.ts:37  |
| <a id="transport"></a> `transport`                          | `protected` | [`ITransport`](../../transport/ITransport/README.md)                                 | `undefined`                | transport instance to use (ITransport) | [`MultiCastChannel`](../MultiCastChannel/README.md).[`transport`](../MultiCastChannel/README.md#transport)                         | packages/octagonal-wheels/src/channel/channels.ts:54  |
| <a id="unsubscribes"></a> `unsubscribes`                    | `protected` | `Set`\<() => `void`\>                                                                | `undefined`                | -                                      | [`MultiCastChannel`](../MultiCastChannel/README.md).[`unsubscribes`](../MultiCastChannel/README.md#unsubscribes)                   | packages/octagonal-wheels/src/channel/channels.ts:62  |

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

[`MultiCastChannel`](../MultiCastChannel/README.md).[`prefixedChannelName`](../MultiCastChannel/README.md#prefixedchannelname)

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

[`MultiCastChannel`](../MultiCastChannel/README.md).[`addUnsubscribe`](../MultiCastChannel/README.md#addunsubscribe)

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

#### Inherited from

[`MultiCastChannel`](../MultiCastChannel/README.md).[`advertiseSubId`](../MultiCastChannel/README.md#advertisesubid)

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

[`MultiCastChannel`](../MultiCastChannel/README.md).[`close`](../MultiCastChannel/README.md#close)

---

### invoke()

```ts
invoke(...args: T): Promise<boolean>;
```

Defined in: packages/octagonal-wheels/src/channel/channels.ts:366

Invoke all registered handlers and return true only if all return true.

#### Parameters

| Parameter | Type |
| --------- | ---- |
| ...`args` | `T`  |

#### Returns

`Promise`\<`boolean`\>

#### Overrides

[`MultiCastChannel`](../MultiCastChannel/README.md).[`invoke`](../MultiCastChannel/README.md#invoke)

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

[`MultiCastChannel`](../MultiCastChannel/README.md).[`publish`](../MultiCastChannel/README.md#publish)

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

[`MultiCastChannel`](../MultiCastChannel/README.md).[`query`](../MultiCastChannel/README.md#query)

---

### register()

```ts
register(func: ChannelFunc<T, boolean>, options?: RegisterOptions): () => void;
```

Defined in: packages/octagonal-wheels/src/channel/channels.ts:265

Register a function to handle incoming messages on the MultiCastChannel.

#### Parameters

| Parameter  | Type                                                        | Description                                                   |
| ---------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| `func`     | [`ChannelFunc`](../ChannelFunc/README.md)\<`T`, `boolean`\> | function to register                                          |
| `options?` | [`RegisterOptions`](../RegisterOptions/README.md)           | optional RegisterOptions, including AbortSignal to unregister |

#### Returns

a function to unregister the handler

() => `void`

#### Inherited from

[`MultiCastChannel`](../MultiCastChannel/README.md).[`register`](../MultiCastChannel/README.md#register)

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

#### Inherited from

[`MultiCastChannel`](../MultiCastChannel/README.md).[`requestAdvertisement`](../MultiCastChannel/README.md#requestadvertisement)

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

#### Inherited from

[`MultiCastChannel`](../MultiCastChannel/README.md).[`respond`](../MultiCastChannel/README.md#respond)

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

[`MultiCastChannel`](../MultiCastChannel/README.md).[`subscribe`](../MultiCastChannel/README.md#subscribe)

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

#### Inherited from

[`MultiCastChannel`](../MultiCastChannel/README.md).[`waitForAnyAdvertisement`](../MultiCastChannel/README.md#waitforanyadvertisement)
