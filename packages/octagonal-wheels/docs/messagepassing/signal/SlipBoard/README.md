[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [messagepassing](../../README.md) / [signal](../README.md) / SlipBoard

# Class: SlipBoard\<Events\>

Defined in: [src/bureau/SlipBoard.ts:63](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/SlipBoard.ts#L63)

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `Events` *extends* `LSSlips` | `LSSlips` |

## Constructors

### Constructor

```ts
new SlipBoard<Events>(): SlipBoard<Events>;
```

#### Returns

`SlipBoard`\<`Events`\>

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="_clip"></a> `_clip` | `Map`\<`string` \| `number` \| `symbol`, [`PromiseWithResolvers`](../../../promises/PromiseWithResolvers/README.md)\<`any`\>\> | [src/bureau/SlipBoard.ts:64](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/SlipBoard.ts#L64) |

## Methods

### awaitNext()

Waits for the next event of the specified type and key, with an optional timeout.

#### Template

The type of the events.

#### Template

The key of the event type.

#### Param

The type of the event to wait for.

#### Param

The key associated with the event.

#### Param

The optional timeout in milliseconds.

#### Call Signature

```ts
awaitNext<ET, K>(
   type: K, 
   key: string, 
opt?: AwaitOptionWithoutTimeout): Promise<ResultType<ET, K>>;
```

Defined in: [src/bureau/SlipBoard.ts:121](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/SlipBoard.ts#L121)

##### Type Parameters

| Type Parameter |
| ------ |
| `ET` *extends* `LSSlips` |
| `K` *extends* `string` \| `number` \| `symbol` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `K` |
| `key` | `string` |
| `opt?` | [`AwaitOptionWithoutTimeout`](../AwaitOptionWithoutTimeout/README.md) |

##### Returns

`Promise`\<`ResultType`\<`ET`, `K`\>\>

#### Call Signature

```ts
awaitNext<ET, K>(
   type: K, 
   key: string, 
   opt?: AwaitOptionWithTimeout): Promise<
  | typeof TIMED_OUT_SIGNAL
| ResultType<ET, K>>;
```

Defined in: [src/bureau/SlipBoard.ts:126](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/SlipBoard.ts#L126)

##### Type Parameters

| Type Parameter |
| ------ |
| `ET` *extends* `LSSlips` |
| `K` *extends* `string` \| `number` \| `symbol` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `K` |
| `key` | `string` |
| `opt?` | [`AwaitOptionWithTimeout`](../AwaitOptionWithTimeout/README.md) |

##### Returns

`Promise`\<
  \| *typeof* [`TIMED_OUT_SIGNAL`](../../../promises/TIMED_OUT_SIGNAL-1/README.md)
  \| `ResultType`\<`ET`, `K`\>\>

***

### isAwaiting()

```ts
isAwaiting<ET, K>(type: SlipType<ET, K>, key: string): boolean;
```

Defined in: [src/bureau/SlipBoard.ts:75](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/SlipBoard.ts#L75)

Checks if a specific key is awaiting.

#### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `ET` *extends* `LSSlips` | The type of the events. |
| `K` *extends* `string` \| `number` \| `symbol` | The key of the event in the events type. |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `type` | `SlipType`\<`ET`, `K`\> | The key representing the event type. |
| `key` | `string` | The key representing the specific sub-event. |

#### Returns

`boolean`

- Returns `true` if the event and sub-event combination is awaiting, otherwise `false`.

***

### issueAndProceed()

```ts
issueAndProceed<T>(
   type: string, 
   key?: string, 
opt?: SlipProcessOptions<T>): Promise<T>;
```

Defined in: [src/bureau/SlipBoard.ts:97](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/SlipBoard.ts#L97)

Issues a slip of process and proceeds with the provided options.

#### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of the result expected from the process. |

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `type` | `string` | `undefined` | The type of the process to be issued. |
| `key?` | `string` | `""` | An optional key to identify the process. |
| `opt?` | [`SlipProcessOptions`](../SlipProcessOptions/README.md)\<`T`\> | `undefined` | The options for the process, including the callback to be executed. |

#### Returns

`Promise`\<`T`\>

- A promise that resolves with the result of the process.

#### Remarks

- If the process is not already awaiting, it will be issued and the callback will be executed.
- If the callback succeeds, the result will be submitted.
- If the callback fails, the error handling depends on the options provided:
  - If `submitAsSuccess` is true, the error (or transformed error) will be submitted as a success.
  - If `dropSlipWithRisks` is true, the process will be deleted from the clip.
  - Otherwise, the error will be rejected.
- The method returns a promise that resolves with the next result of the process.

***

### reject()

```ts
reject<ET, K>(
   type: SlipType<ET, K>, 
   key?: string, 
   reason?: any): void;
```

Defined in: [src/bureau/SlipBoard.ts:228](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/SlipBoard.ts#L228)

Rejects a task promise associated with a specific event type and key.

#### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `ET` *extends* `LSSlips` | The type of events. |
| `K` *extends* `string` \| `number` \| `symbol` | The keys of the events. |

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `type` | `SlipType`\<`ET`, `K`\> | `undefined` | The type of the event. |
| `key?` | `string` | `""` | The key associated with the event. Defaults to an empty string. |
| `reason?` | `any` | `undefined` | The reason for rejecting the promise. |

#### Returns

`void`

***

### submit()

Submits an event of a specified type with optional data.

#### Template

The type of events.

#### Template

The key of the event type in ET.

#### Param

The type of the event to submit.

#### Param

An optional key associated with the event.

#### Param

Optional data to be passed with the event.

#### Call Signature

```ts
submit<ET, K>(type: SlipWithoutData<ET, K>, key: string): void;
```

Defined in: [src/bureau/SlipBoard.ts:173](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/SlipBoard.ts#L173)

##### Type Parameters

| Type Parameter |
| ------ |
| `ET` *extends* `LSSlips` |
| `K` *extends* `string` \| `number` \| `symbol` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `SlipWithoutData`\<`ET`, `K`\> |
| `key` | `string` |

##### Returns

`void`

#### Call Signature

```ts
submit<ET, K>(
   type: SlipWithData<ET, K>, 
   key: string, 
   data: ET[K]): void;
```

Defined in: [src/bureau/SlipBoard.ts:174](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/SlipBoard.ts#L174)

##### Type Parameters

| Type Parameter |
| ------ |
| `ET` *extends* `LSSlips` |
| `K` *extends* `string` \| `number` \| `symbol` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `SlipWithData`\<`ET`, `K`\> |
| `key` | `string` |
| `data` | `ET`\[`K`\] |

##### Returns

`void`

***

### submitToAll()

Submits an event of a specified type to all listeners.

#### Template

The type of events.

#### Template

The key of the event type in ET.

#### Param

The type of the event to submit.

#### Param

The prefix to match the keys of the listeners.

#### Param

Optional data to be passed with the event.

#### Call Signature

```ts
submitToAll<ET, K>(type: SlipWithoutData<ET, K>, prefix: string): void;
```

Defined in: [src/bureau/SlipBoard.ts:196](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/SlipBoard.ts#L196)

##### Type Parameters

| Type Parameter |
| ------ |
| `ET` *extends* `LSSlips` |
| `K` *extends* `string` \| `number` \| `symbol` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `SlipWithoutData`\<`ET`, `K`\> |
| `prefix` | `string` |

##### Returns

`void`

#### Call Signature

```ts
submitToAll<ET, K>(
   type: SlipWithData<ET, K>, 
   prefix: string, 
   data: ET[K]): void;
```

Defined in: [src/bureau/SlipBoard.ts:197](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/SlipBoard.ts#L197)

##### Type Parameters

| Type Parameter |
| ------ |
| `ET` *extends* `LSSlips` |
| `K` *extends* `string` \| `number` \| `symbol` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `SlipWithData`\<`ET`, `K`\> |
| `prefix` | `string` |
| `data` | `ET`\[`K`\] |

##### Returns

`void`
