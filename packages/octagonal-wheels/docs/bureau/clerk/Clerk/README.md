[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [bureau](../../README.md) / [clerk](../README.md) / Clerk

# Class: Clerk\<T\>

Defined in: [src/bureau/Clerk.ts:157](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L157)

## Extends

- [`ClerkBase`](../ClerkBase/README.md)\<`T`\>

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Constructors

### Constructor

```ts
new Clerk<T>(params: ClerkOption<T>): Clerk<T>;
```

Defined in: [src/bureau/Clerk.ts:164](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L164)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`ClerkOption`](../ClerkOption/README.md)\<`T`\> |

#### Returns

`Clerk`\<`T`\>

#### Overrides

[`ClerkBase`](../ClerkBase/README.md).[`constructor`](../ClerkBase/README.md#constructor)

## Properties

| Property | Type | Default value | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="_disposed"></a> `_disposed` | `boolean` | `false` | [`ClerkBase`](../ClerkBase/README.md).[`_disposed`](../ClerkBase/README.md#_disposed) | [src/bureau/Clerk.ts:57](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L57) |
| <a id="_disposepromise"></a> `_disposePromise` | \{ `promise`: `Promise`\<`void`\>; `reject`: (`reason?`: `any`) => `void`; `resolve`: (`value`: `void` \| `PromiseLike`\<`void`\>) => `void`; \} | `undefined` | [`ClerkBase`](../ClerkBase/README.md).[`_disposePromise`](../ClerkBase/README.md#_disposepromise) | [src/bureau/Clerk.ts:58](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L58) |
| `_disposePromise.promise` | `Promise`\<`void`\> | `undefined` | - | [src/promises.ts:67](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L67) |
| `_disposePromise.reject` | (`reason?`: `any`) => `void` | `undefined` | - | [src/promises.ts:67](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L67) |
| `_disposePromise.resolve` | (`value`: `void` \| `PromiseLike`\<`void`\>) => `void` | `undefined` | - | [src/promises.ts:67](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L67) |
| <a id="_inbox"></a> `_inbox` | [`Inbox`](../../inbox/Inbox/README.md)\<`T`\> | `undefined` | [`ClerkBase`](../ClerkBase/README.md).[`_inbox`](../ClerkBase/README.md#_inbox) | [src/bureau/Clerk.ts:47](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L47) |
| <a id="_job"></a> `_job` | (`item`: `T`) => `Promise`\<`any`\> | `undefined` | - | [src/bureau/Clerk.ts:162](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L162) |
| <a id="_name"></a> `_name` | `string` | `undefined` | [`ClerkBase`](../ClerkBase/README.md).[`_name`](../ClerkBase/README.md#_name) | [src/bureau/Clerk.ts:48](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L48) |
| <a id="_onprogress"></a> `_onProgress?` | (`state`: `ClerkStateDetail`) => `void` | `undefined` | [`ClerkBase`](../ClerkBase/README.md).[`_onProgress`](../ClerkBase/README.md#_onprogress) | [src/bureau/Clerk.ts:85](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L85) |
| <a id="_state"></a> `_state` | [`ClerkState`](../ClerkState/README.md) | `ClerkState.STALLED` | [`ClerkBase`](../ClerkBase/README.md).[`_state`](../ClerkBase/README.md#_state) | [src/bureau/Clerk.ts:52](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L52) |
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

Defined in: [src/bureau/Clerk.ts:69](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L69)

##### Returns

`ClerkStateDetail`

#### Inherited from

[`ClerkBase`](../ClerkBase/README.md).[`stateDetail`](../ClerkBase/README.md#statedetail)

## Methods

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

Defined in: [src/bureau/Clerk.ts:158](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L158)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `item` | `T` |

#### Returns

`Promise`\<`void`\>

#### Overrides

[`ClerkBase`](../ClerkBase/README.md).[`_onPick`](../ClerkBase/README.md#_onpick)

***

### \_onSentinel()?

```ts
optional _onSentinel(item: SENTINELS): Promise<any>;
```

Defined in: [src/bureau/Clerk.ts:50](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L50)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `item` | [`SENTINELS`](../SENTINELS/README.md) |

#### Returns

`Promise`\<`any`\>

#### Inherited from

[`ClerkBase`](../ClerkBase/README.md).[`_onSentinel`](../ClerkBase/README.md#_onsentinel)

***

### dispose()

```ts
dispose(): void;
```

Defined in: [src/bureau/Clerk.ts:146](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L146)

#### Returns

`void`

#### Inherited from

[`ClerkBase`](../ClerkBase/README.md).[`dispose`](../ClerkBase/README.md#dispose)

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
