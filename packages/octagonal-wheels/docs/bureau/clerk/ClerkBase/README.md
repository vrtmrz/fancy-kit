[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [bureau](../../README.md) / [clerk](../README.md) / ClerkBase

# Abstract Class: ClerkBase\<T\>

Defined in: [src/bureau/Clerk.ts:46](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L46)

## Extended by

- [`Clerk`](../Clerk/README.md)
- [`Porter`](../Porter/README.md)
- [`Harvester`](../Harvester/README.md)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Constructors

### Constructor

```ts
new ClerkBase<T>(params: ClerkOptionBase<T>): ClerkBase<T>;
```

Defined in: [src/bureau/Clerk.ts:62](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L62)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`ClerkOptionBase`](../ClerkOptionBase/README.md)\<`T`\> |

#### Returns

`ClerkBase`\<`T`\>

## Properties

| Property | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="_disposed"></a> `_disposed` | `boolean` | `false` | [src/bureau/Clerk.ts:57](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L57) |
| <a id="_disposepromise"></a> `_disposePromise` | \{ `promise`: `Promise`\<`void`\>; `reject`: (`reason?`: `any`) => `void`; `resolve`: (`value`: `void` \| `PromiseLike`\<`void`\>) => `void`; \} | `undefined` | [src/bureau/Clerk.ts:58](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L58) |
| `_disposePromise.promise` | `Promise`\<`void`\> | `undefined` | [src/promises.ts:67](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L67) |
| `_disposePromise.reject` | (`reason?`: `any`) => `void` | `undefined` | [src/promises.ts:67](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L67) |
| `_disposePromise.resolve` | (`value`: `void` \| `PromiseLike`\<`void`\>) => `void` | `undefined` | [src/promises.ts:67](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L67) |
| <a id="_inbox"></a> `_inbox` | [`Inbox`](../../inbox/Inbox/README.md)\<`T`\> | `undefined` | [src/bureau/Clerk.ts:47](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L47) |
| <a id="_name"></a> `_name` | `string` | `undefined` | [src/bureau/Clerk.ts:48](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L48) |
| <a id="_onprogress"></a> `_onProgress?` | (`state`: `ClerkStateDetail`) => `void` | `undefined` | [src/bureau/Clerk.ts:85](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L85) |
| <a id="_state"></a> `_state` | [`ClerkState`](../ClerkState/README.md) | `ClerkState.STALLED` | [src/bureau/Clerk.ts:52](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L52) |
| <a id="_totalfailed"></a> `_totalFailed` | `number` | `0` | [src/bureau/Clerk.ts:55](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L55) |
| <a id="_totalfetched"></a> `_totalFetched` | `number` | `0` | [src/bureau/Clerk.ts:56](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L56) |
| <a id="_totalprocessed"></a> `_totalProcessed` | `number` | `0` | [src/bureau/Clerk.ts:53](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L53) |
| <a id="_totalsuccess"></a> `_totalSuccess` | `number` | `0` | [src/bureau/Clerk.ts:54](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L54) |

## Accessors

### onDisposed

#### Get Signature

```ts
get onDisposed(): Promise<void>;
```

Defined in: [src/bureau/Clerk.ts:152](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L152)

##### Returns

`Promise`\<`void`\>

***

### state

#### Get Signature

```ts
get state(): ClerkState;
```

Defined in: [src/bureau/Clerk.ts:59](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L59)

##### Returns

[`ClerkState`](../ClerkState/README.md)

***

### stateDetail

#### Get Signature

```ts
get stateDetail(): ClerkStateDetail;
```

Defined in: [src/bureau/Clerk.ts:69](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L69)

##### Returns

`ClerkStateDetail`

## Methods

### \_mainLoop()

```ts
_mainLoop(): Promise<void>;
```

Defined in: [src/bureau/Clerk.ts:97](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L97)

#### Returns

`Promise`\<`void`\>

***

### \_onPick()

```ts
abstract _onPick(item: T): Promise<void>;
```

Defined in: [src/bureau/Clerk.ts:49](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L49)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `item` | `T` |

#### Returns

`Promise`\<`void`\>

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

***

### dispose()

```ts
dispose(): void;
```

Defined in: [src/bureau/Clerk.ts:146](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L146)

#### Returns

`void`

***

### onProgress()

```ts
onProgress(): void;
```

Defined in: [src/bureau/Clerk.ts:87](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L87)

#### Returns

`void`

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
