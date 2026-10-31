[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [channel](../../README.md) / [channels](../README.md) / ChannelBase

# Abstract Class: ChannelBase

Defined in: packages/octagonal-wheels/src/channel/channels.ts:35

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

Defined in: packages/octagonal-wheels/src/channel/channels.ts:52

Base Class for Channels

#### Parameters

| Parameter     | Type                                                 | Description                                                                                                    |
| ------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `channelName` | `string`                                             | unique name of the channel                                                                                     |
| `transport`   | [`ITransport`](../../transport/ITransport/README.md) | transport instance to use (ITransport)                                                                         |
| `prefix`      | `string`                                             | prefix for the channel type (e.g., "port:", "broadcaster:", etc). We should set this via subclass constructor. |

#### Returns

`ChannelBase`

## Properties

| Property                                 | Modifier    | Type                                                 | Default value              | Description                            | Defined in                                           |
| ---------------------------------------- | ----------- | ---------------------------------------------------- | -------------------------- | -------------------------------------- | ---------------------------------------------------- |
| <a id="channelname"></a> `channelName`   | `protected` | `string`                                             | `undefined`                | -                                      | packages/octagonal-wheels/src/channel/channels.ts:44 |
| <a id="prefix"></a> `prefix`             | `protected` | `string`                                             | `undefined`                | -                                      | packages/octagonal-wheels/src/channel/channels.ts:39 |
| <a id="timeoutms"></a> `timeoutMs`       | `protected` | `number`                                             | `DEFAULT_QUERY_TIMEOUT_MS` | -                                      | packages/octagonal-wheels/src/channel/channels.ts:37 |
| <a id="transport"></a> `transport`       | `protected` | [`ITransport`](../../transport/ITransport/README.md) | `undefined`                | transport instance to use (ITransport) | packages/octagonal-wheels/src/channel/channels.ts:54 |
| <a id="unsubscribes"></a> `unsubscribes` | `protected` | `Set`\<() => `void`\>                                | `undefined`                | -                                      | packages/octagonal-wheels/src/channel/channels.ts:62 |

## Accessors

### prefixedChannelName

#### Get Signature

```ts
get prefixedChannelName(): string;
```

Defined in: packages/octagonal-wheels/src/channel/channels.ts:41

##### Returns

`string`

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

---

### register()

```ts
abstract register(func: ChannelFunc<any, any>, options?: RegisterOptions): () => void;
```

Defined in: packages/octagonal-wheels/src/channel/channels.ts:131

Register a function to handle incoming requests on the channel.

#### Parameters

| Parameter  | Type                                                      | Description                                                   |
| ---------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| `func`     | [`ChannelFunc`](../ChannelFunc/README.md)\<`any`, `any`\> | async function to handle requests                             |
| `options?` | [`RegisterOptions`](../RegisterOptions/README.md)         | optional RegisterOptions, including AbortSignal to unregister |

#### Returns

a function to unregister the handler

() => `void`

---

### respond()

```ts
protected respond(
   OriginalMessage: RequestMessage<any>,
   data: {
  error?: any;
  result?: any;
},
   extra?: any): void;
```

Defined in: packages/octagonal-wheels/src/channel/channels.ts:89

#### Parameters

| Parameter         | Type                                     |
| ----------------- | ---------------------------------------- |
| `OriginalMessage` | `RequestMessage`\<`any`\>                |
| `data`            | \{ `error?`: `any`; `result?`: `any`; \} |
| `data.error?`     | `any`                                    |
| `data.result?`    | `any`                                    |
| `extra`           | `any`                                    |

#### Returns

`void`

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
