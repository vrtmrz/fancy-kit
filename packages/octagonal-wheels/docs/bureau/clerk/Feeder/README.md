[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [bureau](../../README.md) / [clerk](../README.md) / Feeder

# Class: Feeder\<T\>

Defined in: [src/bureau/Clerk.ts:359](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L359)

The `Feeder` class is responsible for fetching items from a source and posting them to a target inbox.
It supports both synchronous and asynchronous iteration over the source.

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of items being processed. |

## Constructors

### Constructor

```ts
new Feeder<T>(params: {
  onProgress?: (state: FeederStateDetail) => void;
  source: Iterable<T, any, any> | AsyncIterable<T, any, any>;
  target: Inbox<T>;
}): Feeder<T>;
```

Defined in: [src/bureau/Clerk.ts:385](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L385)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | \{ `onProgress?`: (`state`: `FeederStateDetail`) => `void`; `source`: `Iterable`\<`T`, `any`, `any`\> \| `AsyncIterable`\<`T`, `any`, `any`\>; `target`: [`Inbox`](../../inbox/Inbox/README.md)\<`T`\>; \} | The parameters for the feeder. |
| `params.onProgress?` | (`state`: `FeederStateDetail`) => `void` | Optional callback function to report progress. |
| `params.source` | `Iterable`\<`T`, `any`, `any`\> \| `AsyncIterable`\<`T`, `any`, `any`\> | The source of items to be processed. |
| `params.target` | [`Inbox`](../../inbox/Inbox/README.md)\<`T`\> | The target inbox where items are posted. |

#### Returns

`Feeder`\<`T`\>

## Properties

| Property | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="_hasfinished"></a> `_hasFinished` | `boolean` | `false` | [src/bureau/Clerk.ts:360](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L360) |
| <a id="_hasstarted"></a> `_hasStarted` | `boolean` | `false` | [src/bureau/Clerk.ts:361](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L361) |
| <a id="_onprogress"></a> `_onProgress?` | (`state`: `FeederStateDetail`) => `void` | `undefined` | [src/bureau/Clerk.ts:366](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L366) |
| <a id="_source"></a> `_source` | `Iterable`\<`T`, `any`, `any`\> \| `AsyncIterable`\<`T`, `any`, `any`\> | `undefined` | [src/bureau/Clerk.ts:364](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L364) |
| <a id="_target"></a> `_target` | [`Inbox`](../../inbox/Inbox/README.md)\<`T`\> | `undefined` | [src/bureau/Clerk.ts:365](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L365) |
| <a id="_totalfetched"></a> `_totalFetched` | `number` | `0` | [src/bureau/Clerk.ts:362](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L362) |
| <a id="_totalprocessed"></a> `_totalProcessed` | `number` | `0` | [src/bureau/Clerk.ts:363](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L363) |

## Accessors

### stateDetail

#### Get Signature

```ts
get stateDetail(): FeederStateDetail;
```

Defined in: [src/bureau/Clerk.ts:417](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L417)

##### Returns

`FeederStateDetail`

Returns the current state details of the feeder.

## Methods

### \_mainLoop()

```ts
_mainLoop(): Promise<void>;
```

Defined in: [src/bureau/Clerk.ts:396](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L396)

The main loop that fetches items from the source and posts them to the target.

#### Returns

`Promise`\<`void`\>

***

### onProgress()

```ts
onProgress(): void;
```

Defined in: [src/bureau/Clerk.ts:367](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L367)

Calls the progress callback with the current state details.

#### Returns

`void`

***

### setOnProgress()

```ts
setOnProgress(callback: (state: FeederStateDetail) => void): void;
```

Defined in: [src/bureau/Clerk.ts:374](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L374)

Sets the progress callback function.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `callback` | (`state`: `FeederStateDetail`) => `void` |

#### Returns

`void`
