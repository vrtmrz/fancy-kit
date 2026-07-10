[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [bureau](../../README.md) / [clerk](../README.md) / Porter

# Class: Porter\<T\>

Defined in: [src/bureau/Clerk.ts:247](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L247)

A clerk that making batch of items and posts that to another inbox.
Please keep in mind that the interval of consuming results should be realised by `PaceMaker`.

## Extends

- [`ClerkBase`](../ClerkBase/README.md)\<`T`\>

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of items being processed. |

## Constructors

### Constructor

```ts
new Porter<T>(params: {
  from: Inbox<T>;
  maxSize: number;
  timeout?: number;
  to: Inbox<T[]>;
}): Porter<T>;
```

Defined in: [src/bureau/Clerk.ts:333](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L333)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | \{ `from`: [`Inbox`](../../inbox/Inbox/README.md)\<`T`\>; `maxSize`: `number`; `timeout?`: `number`; `to`: [`Inbox`](../../inbox/Inbox/README.md)\<`T`[]\>; \} |
| `params.from` | [`Inbox`](../../inbox/Inbox/README.md)\<`T`\> |
| `params.maxSize` | `number` |
| `params.timeout?` | `number` |
| `params.to` | [`Inbox`](../../inbox/Inbox/README.md)\<`T`[]\> |

#### Returns

`Porter`\<`T`\>

#### Overrides

[`ClerkBase`](../ClerkBase/README.md).[`constructor`](../ClerkBase/README.md#constructor)

## Properties

| Property | Type | Default value | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="_buffer"></a> `_buffer` | `T`[] | `[]` | - | [src/bureau/Clerk.ts:251](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L251) |
| <a id="_disposed"></a> `_disposed` | `boolean` | `false` | [`ClerkBase`](../ClerkBase/README.md).[`_disposed`](../ClerkBase/README.md#_disposed) | [src/bureau/Clerk.ts:57](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L57) |
| <a id="_disposepromise"></a> `_disposePromise` | \{ `promise`: `Promise`\<`void`\>; `reject`: (`reason?`: `any`) => `void`; `resolve`: (`value`: `void` \| `PromiseLike`\<`void`\>) => `void`; \} | `undefined` | [`ClerkBase`](../ClerkBase/README.md).[`_disposePromise`](../ClerkBase/README.md#_disposepromise) | [src/bureau/Clerk.ts:58](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L58) |
| `_disposePromise.promise` | `Promise`\<`void`\> | `undefined` | - | [src/promises.ts:67](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L67) |
| `_disposePromise.reject` | (`reason?`: `any`) => `void` | `undefined` | - | [src/promises.ts:67](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L67) |
| `_disposePromise.resolve` | (`value`: `void` \| `PromiseLike`\<`void`\>) => `void` | `undefined` | - | [src/promises.ts:67](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L67) |
| <a id="_flushing"></a> `_flushing` | `Promise`\<`void`\> | `undefined` | - | [src/bureau/Clerk.ts:253](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L253) |
| <a id="_inbox"></a> `_inbox` | [`Inbox`](../../inbox/Inbox/README.md)\<`T`\> | `undefined` | [`ClerkBase`](../ClerkBase/README.md).[`_inbox`](../ClerkBase/README.md#_inbox) | [src/bureau/Clerk.ts:47](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L47) |
| <a id="_maxsize"></a> `_maxSize` | `number` | `undefined` | - | [src/bureau/Clerk.ts:250](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L250) |
| <a id="_name"></a> `_name` | `string` | `undefined` | [`ClerkBase`](../ClerkBase/README.md).[`_name`](../ClerkBase/README.md#_name) | [src/bureau/Clerk.ts:48](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L48) |
| <a id="_onprogress"></a> `_onProgress?` | (`state`: `ClerkStateDetail`) => `void` | `undefined` | [`ClerkBase`](../ClerkBase/README.md).[`_onProgress`](../ClerkBase/README.md#_onprogress) | [src/bureau/Clerk.ts:85](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L85) |
| <a id="_outgoing"></a> `_outgoing` | [`Inbox`](../../inbox/Inbox/README.md)\<`T`[]\> | `undefined` | - | [src/bureau/Clerk.ts:248](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L248) |
| <a id="_separatechunk"></a> `_separateChunk` | `boolean` | `false` | - | [src/bureau/Clerk.ts:254](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L254) |
| <a id="_state"></a> `_state` | [`ClerkState`](../ClerkState/README.md) | `ClerkState.STALLED` | [`ClerkBase`](../ClerkBase/README.md).[`_state`](../ClerkBase/README.md#_state) | [src/bureau/Clerk.ts:52](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L52) |
| <a id="_timeout"></a> `_timeout?` | `number` | `undefined` | - | [src/bureau/Clerk.ts:249](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L249) |
| <a id="_timeouttimer"></a> `_timeoutTimer` | `undefined` \| `Timeout` | `undefined` | - | [src/bureau/Clerk.ts:252](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L252) |
| <a id="_totalfailed"></a> `_totalFailed` | `number` | `0` | [`ClerkBase`](../ClerkBase/README.md).[`_totalFailed`](../ClerkBase/README.md#_totalfailed) | [src/bureau/Clerk.ts:55](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L55) |
| <a id="_totalfetched"></a> `_totalFetched` | `number` | `0` | [`ClerkBase`](../ClerkBase/README.md).[`_totalFetched`](../ClerkBase/README.md#_totalfetched) | [src/bureau/Clerk.ts:56](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L56) |
| <a id="_totalprocessed"></a> `_totalProcessed` | `number` | `0` | [`ClerkBase`](../ClerkBase/README.md).[`_totalProcessed`](../ClerkBase/README.md#_totalprocessed) | [src/bureau/Clerk.ts:53](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L53) |
| <a id="_totalsuccess"></a> `_totalSuccess` | `number` | `0` | [`ClerkBase`](../ClerkBase/README.md).[`_totalSuccess`](../ClerkBase/README.md#_totalsuccess) | [src/bureau/Clerk.ts:54](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L54) |

## Accessors

### onDisposed

#### Get Signature

```ts
get onDisposed(): Promise<void>;
```

Defined in: [src/bureau/Clerk.ts:152](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L152)

##### Returns

`Promise`\<`void`\>

#### Inherited from

[`ClerkBase`](../ClerkBase/README.md).[`onDisposed`](../ClerkBase/README.md#ondisposed)

***

### state

#### Get Signature

```ts
get state(): ClerkState;
```

Defined in: [src/bureau/Clerk.ts:59](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L59)

##### Returns

[`ClerkState`](../ClerkState/README.md)

#### Inherited from

[`ClerkBase`](../ClerkBase/README.md).[`state`](../ClerkBase/README.md#state)

***

### stateDetail

#### Get Signature

```ts
get stateDetail(): ClerkStateDetail;
```

Defined in: [src/bureau/Clerk.ts:283](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L283)

##### Returns

`ClerkStateDetail`

Returns the current state details.

#### Overrides

[`ClerkBase`](../ClerkBase/README.md).[`stateDetail`](../ClerkBase/README.md#statedetail)

## Methods

### \_flush()

```ts
_flush(): Promise<void>;
```

Defined in: [src/bureau/Clerk.ts:255](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L255)

#### Returns

`Promise`\<`void`\>

***

### \_mainLoop()

```ts
_mainLoop(): Promise<void>;
```

Defined in: [src/bureau/Clerk.ts:97](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L97)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`ClerkBase`](../ClerkBase/README.md).[`_mainLoop`](../ClerkBase/README.md#_mainloop)

***

### \_onPick()

```ts
_onPick(item: T): Promise<void>;
```

Defined in: [src/bureau/Clerk.ts:299](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L299)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `item` | `T` |

#### Returns

`Promise`\<`void`\>

#### Overrides

[`ClerkBase`](../ClerkBase/README.md).[`_onPick`](../ClerkBase/README.md#_onpick)

***

### \_onSentinel()

```ts
_onSentinel(item: SENTINELS): Promise<void>;
```

Defined in: [src/bureau/Clerk.ts:290](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L290)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `item` | [`SENTINELS`](../SENTINELS/README.md) |

#### Returns

`Promise`\<`void`\>

#### Overrides

[`ClerkBase`](../ClerkBase/README.md).[`_onSentinel`](../ClerkBase/README.md#_onsentinel)

***

### changeParams()

```ts
changeParams(params: {
  maxSize?: number;
  timeout?: number;
}): Promise<void>;
```

Defined in: [src/bureau/Clerk.ts:318](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L318)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | \{ `maxSize?`: `number`; `timeout?`: `number`; \} |
| `params.maxSize?` | `number` |
| `params.timeout?` | `number` |

#### Returns

`Promise`\<`void`\>

***

### dispose()

```ts
dispose(): void;
```

Defined in: [src/bureau/Clerk.ts:340](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L340)

#### Returns

`void`

#### Overrides

[`ClerkBase`](../ClerkBase/README.md).[`dispose`](../ClerkBase/README.md#dispose)

***

### flush()

```ts
flush(): Promise<void>;
```

Defined in: [src/bureau/Clerk.ts:314](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L314)

#### Returns

`Promise`\<`void`\>

***

### onProgress()

```ts
onProgress(): void;
```

Defined in: [src/bureau/Clerk.ts:87](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L87)

#### Returns

`void`

#### Inherited from

[`ClerkBase`](../ClerkBase/README.md).[`onProgress`](../ClerkBase/README.md#onprogress)

***

### setOnProgress()

```ts
setOnProgress(callback: (state: ClerkStateDetail) => void): void;
```

Defined in: [src/bureau/Clerk.ts:94](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L94)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `callback` | (`state`: `ClerkStateDetail`) => `void` |

#### Returns

`void`

#### Inherited from

[`ClerkBase`](../ClerkBase/README.md).[`setOnProgress`](../ClerkBase/README.md#setonprogress)
