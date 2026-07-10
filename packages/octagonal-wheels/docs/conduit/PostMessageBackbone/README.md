[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / PostMessageBackbone

# Class: PostMessageBackbone\<T\>

Defined in: [src/conduit/transporterAdapter.ts:37](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L37)

PostMessageBackbone is a TransporterBackbone implementation that uses the postMessage API to send and receive messages.
It can be used with MessageChannel, Window, Worker, or any other target that supports postMessage.
Note that this backbone is dedicated one to be assigned to a single transporter.
Please share the `MessageChannel` or `Worker` instance between multiple transporters
if you want to communicate with multiple transporters.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Implements

- [`TransporterBackbone`](../TransporterBackbone/README.md)\<`T`\>

## Constructors

### Constructor

```ts
new PostMessageBackbone<T>(channel: MessageChannel): PostMessageBackbone<T>;
```

Defined in: [src/conduit/transporterAdapter.ts:38](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L38)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `channel` | `MessageChannel` |

#### Returns

`PostMessageBackbone`\<`T`\>

### Constructor

```ts
new PostMessageBackbone<T>(receiver: TransporterTarget, transmitter?: TransporterTarget): PostMessageBackbone<T>;
```

Defined in: [src/conduit/transporterAdapter.ts:39](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L39)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `receiver` | [`TransporterTarget`](../TransporterTarget/README.md) |
| `transmitter?` | [`TransporterTarget`](../TransporterTarget/README.md) |

#### Returns

`PostMessageBackbone`\<`T`\>

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="_abortcontroller"></a> `_abortController` | `AbortController` | [src/conduit/transporterAdapter.ts:64](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L64) |
| <a id="_messagehandler"></a> `_messageHandler` | `Map`\<`string`, (`message`: `T`) => `void`\> | [src/conduit/transporterAdapter.ts:70](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L70) |
| <a id="_onceset"></a> `_onceSet` | `Map`\<`string`, `WeakSet`\<(`message`: `T`) => `void`\>\> | [src/conduit/transporterAdapter.ts:72](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L72) |
| <a id="_rx"></a> `_rx` | [`TransporterTarget`](../TransporterTarget/README.md) | [src/conduit/transporterAdapter.ts:61](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L61) |
| <a id="_tx"></a> `_tx` | [`TransporterTarget`](../TransporterTarget/README.md) | [src/conduit/transporterAdapter.ts:62](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L62) |

## Methods

### \_onMessageOnTarget()

```ts
_onMessageOnTarget(event: Event): TransportResult;
```

Defined in: [src/conduit/transporterAdapter.ts:74](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L74)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `Event` |

#### Returns

`TransportResult`

***

### close()

```ts
close(): void;
```

Defined in: [src/conduit/transporterAdapter.ts:173](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L173)

#### Returns

`void`

#### Implementation of

[`TransporterBackbone`](../TransporterBackbone/README.md).[`close`](../TransporterBackbone/README.md#close)

***

### dispatchMessage()

```ts
dispatchMessage(type: string, message: T): void;
```

Defined in: [src/conduit/transporterAdapter.ts:159](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L159)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `string` |
| `message` | `T` |

#### Returns

`void`

#### Implementation of

[`TransporterBackbone`](../TransporterBackbone/README.md).[`dispatchMessage`](../TransporterBackbone/README.md#dispatchmessage)

***

### removeListener()

```ts
removeListener(type: string, callback: (message: T) => void): void;
```

Defined in: [src/conduit/transporterAdapter.ts:146](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L146)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `string` |
| `callback` | (`message`: `T`) => `void` |

#### Returns

`void`

#### Implementation of

[`TransporterBackbone`](../TransporterBackbone/README.md).[`removeListener`](../TransporterBackbone/README.md#removelistener)

***

### setListener()

```ts
setListener(
   type: string, 
   callback: (message: T) => void, 
   opt: {
  once?: boolean;
  signal?: AbortSignal;
}): () => void;
```

Defined in: [src/conduit/transporterAdapter.ts:124](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L124)

Registers a callback to be called when a message is received.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `type` | `string` | - |
| `callback` | (`message`: `T`) => `void` | The function to call when a message is received. |
| `opt` | \{ `once?`: `boolean`; `signal?`: `AbortSignal`; \} | - |
| `opt.once?` | `boolean` | - |
| `opt.signal?` | `AbortSignal` | - |

#### Returns

A function that can be called to remove the listener.

```ts
(): void;
```

##### Returns

`void`

#### Implementation of

[`TransporterBackbone`](../TransporterBackbone/README.md).[`setListener`](../TransporterBackbone/README.md#setlistener)
