[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [bureau](../../README.md) / [clerk](../README.md) / Porter

# Class: Porter\<T\>

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:247

A clerk that making batch of items and posts that to another inbox.
Please keep in mind that the interval of consuming results should be realised by `PaceMaker`.

## Extends

- [`ClerkBase`](../ClerkBase/README.md)\<`T`\>

## Type Parameters

| Type Parameter | Description                        |
| -------------- | ---------------------------------- |
| `T`            | The type of items being processed. |

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

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:333

#### Parameters

| Parameter         | Type                                                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `params`          | \{ `from`: [`Inbox`](../../inbox/Inbox/README.md)\<`T`\>; `maxSize`: `number`; `timeout?`: `number`; `to`: [`Inbox`](../../inbox/Inbox/README.md)\<`T`[]\>; \} |
| `params.from`     | [`Inbox`](../../inbox/Inbox/README.md)\<`T`\>                                                                                                                  |
| `params.maxSize`  | `number`                                                                                                                                                       |
| `params.timeout?` | `number`                                                                                                                                                       |
| `params.to`       | [`Inbox`](../../inbox/Inbox/README.md)\<`T`[]\>                                                                                                                |

#### Returns

`Porter`\<`T`\>

#### Overrides

[`ClerkBase`](../ClerkBase/README.md).[`constructor`](../ClerkBase/README.md#constructor)

## Properties

| Property                                       | Type                                                                                                                                             | Default value        | Inherited from                                                                                    | Defined in                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| <a id="_buffer"></a> `_buffer`                 | `T`[]                                                                                                                                            | `[]`                 | -                                                                                                 | packages/octagonal-wheels/src/bureau/Clerk.ts:251 |
| <a id="_disposed"></a> `_disposed`             | `boolean`                                                                                                                                        | `false`              | [`ClerkBase`](../ClerkBase/README.md).[`_disposed`](../ClerkBase/README.md#_disposed)             | packages/octagonal-wheels/src/bureau/Clerk.ts:57  |
| <a id="_disposepromise"></a> `_disposePromise` | \{ `promise`: `Promise`\<`void`\>; `reject`: (`reason?`: `any`) => `void`; `resolve`: (`value`: `void` \| `PromiseLike`\<`void`\>) => `void`; \} | `undefined`          | [`ClerkBase`](../ClerkBase/README.md).[`_disposePromise`](../ClerkBase/README.md#_disposepromise) | packages/octagonal-wheels/src/bureau/Clerk.ts:58  |
| `_disposePromise.promise`                      | `Promise`\<`void`\>                                                                                                                              | `undefined`          | -                                                                                                 | packages/octagonal-wheels/src/promises.ts:67      |
| `_disposePromise.reject`                       | (`reason?`: `any`) => `void`                                                                                                                     | `undefined`          | -                                                                                                 | packages/octagonal-wheels/src/promises.ts:67      |
| `_disposePromise.resolve`                      | (`value`: `void` \| `PromiseLike`\<`void`\>) => `void`                                                                                           | `undefined`          | -                                                                                                 | packages/octagonal-wheels/src/promises.ts:67      |
| <a id="_flushing"></a> `_flushing`             | `Promise`\<`void`\>                                                                                                                              | `undefined`          | -                                                                                                 | packages/octagonal-wheels/src/bureau/Clerk.ts:253 |
| <a id="_inbox"></a> `_inbox`                   | [`Inbox`](../../inbox/Inbox/README.md)\<`T`\>                                                                                                    | `undefined`          | [`ClerkBase`](../ClerkBase/README.md).[`_inbox`](../ClerkBase/README.md#_inbox)                   | packages/octagonal-wheels/src/bureau/Clerk.ts:47  |
| <a id="_maxsize"></a> `_maxSize`               | `number`                                                                                                                                         | `undefined`          | -                                                                                                 | packages/octagonal-wheels/src/bureau/Clerk.ts:250 |
| <a id="_name"></a> `_name`                     | `string`                                                                                                                                         | `undefined`          | [`ClerkBase`](../ClerkBase/README.md).[`_name`](../ClerkBase/README.md#_name)                     | packages/octagonal-wheels/src/bureau/Clerk.ts:48  |
| <a id="_onprogress"></a> `_onProgress?`        | (`state`: `ClerkStateDetail`) => `void`                                                                                                          | `undefined`          | [`ClerkBase`](../ClerkBase/README.md).[`_onProgress`](../ClerkBase/README.md#_onprogress)         | packages/octagonal-wheels/src/bureau/Clerk.ts:85  |
| <a id="_outgoing"></a> `_outgoing`             | [`Inbox`](../../inbox/Inbox/README.md)\<`T`[]\>                                                                                                  | `undefined`          | -                                                                                                 | packages/octagonal-wheels/src/bureau/Clerk.ts:248 |
| <a id="_separatechunk"></a> `_separateChunk`   | `boolean`                                                                                                                                        | `false`              | -                                                                                                 | packages/octagonal-wheels/src/bureau/Clerk.ts:254 |
| <a id="_state"></a> `_state`                   | [`ClerkState`](../ClerkState/README.md)                                                                                                          | `ClerkState.STALLED` | [`ClerkBase`](../ClerkBase/README.md).[`_state`](../ClerkBase/README.md#_state)                   | packages/octagonal-wheels/src/bureau/Clerk.ts:52  |
| <a id="_timeout"></a> `_timeout?`              | `number`                                                                                                                                         | `undefined`          | -                                                                                                 | packages/octagonal-wheels/src/bureau/Clerk.ts:249 |
| <a id="_timeouttimer"></a> `_timeoutTimer`     | `Timeout` \| `undefined`                                                                                                                         | `undefined`          | -                                                                                                 | packages/octagonal-wheels/src/bureau/Clerk.ts:252 |
| <a id="_totalfailed"></a> `_totalFailed`       | `number`                                                                                                                                         | `0`                  | [`ClerkBase`](../ClerkBase/README.md).[`_totalFailed`](../ClerkBase/README.md#_totalfailed)       | packages/octagonal-wheels/src/bureau/Clerk.ts:55  |
| <a id="_totalfetched"></a> `_totalFetched`     | `number`                                                                                                                                         | `0`                  | [`ClerkBase`](../ClerkBase/README.md).[`_totalFetched`](../ClerkBase/README.md#_totalfetched)     | packages/octagonal-wheels/src/bureau/Clerk.ts:56  |
| <a id="_totalprocessed"></a> `_totalProcessed` | `number`                                                                                                                                         | `0`                  | [`ClerkBase`](../ClerkBase/README.md).[`_totalProcessed`](../ClerkBase/README.md#_totalprocessed) | packages/octagonal-wheels/src/bureau/Clerk.ts:53  |
| <a id="_totalsuccess"></a> `_totalSuccess`     | `number`                                                                                                                                         | `0`                  | [`ClerkBase`](../ClerkBase/README.md).[`_totalSuccess`](../ClerkBase/README.md#_totalsuccess)     | packages/octagonal-wheels/src/bureau/Clerk.ts:54  |

## Accessors

### onDisposed

#### Get Signature

```ts
get onDisposed(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:152

##### Returns

`Promise`\<`void`\>

#### Inherited from

[`ClerkBase`](../ClerkBase/README.md).[`onDisposed`](../ClerkBase/README.md#ondisposed)

---

### state

#### Get Signature

```ts
get state(): ClerkState;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:59

##### Returns

[`ClerkState`](../ClerkState/README.md)

#### Inherited from

[`ClerkBase`](../ClerkBase/README.md).[`state`](../ClerkBase/README.md#state)

---

### stateDetail

#### Get Signature

```ts
get stateDetail(): ClerkStateDetail;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:283

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

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:255

#### Returns

`Promise`\<`void`\>

---

### \_mainLoop()

```ts
_mainLoop(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:97

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`ClerkBase`](../ClerkBase/README.md).[`_mainLoop`](../ClerkBase/README.md#_mainloop)

---

### \_onPick()

```ts
_onPick(item: T): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:299

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `item`    | `T`  |

#### Returns

`Promise`\<`void`\>

#### Overrides

[`ClerkBase`](../ClerkBase/README.md).[`_onPick`](../ClerkBase/README.md#_onpick)

---

### \_onSentinel()

```ts
_onSentinel(item: SENTINELS): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:290

#### Parameters

| Parameter | Type                                  |
| --------- | ------------------------------------- |
| `item`    | [`SENTINELS`](../SENTINELS/README.md) |

#### Returns

`Promise`\<`void`\>

#### Overrides

[`ClerkBase`](../ClerkBase/README.md).[`_onSentinel`](../ClerkBase/README.md#_onsentinel)

---

### changeParams()

```ts
changeParams(params: {
  maxSize?: number;
  timeout?: number;
}): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:318

#### Parameters

| Parameter         | Type                                              |
| ----------------- | ------------------------------------------------- |
| `params`          | \{ `maxSize?`: `number`; `timeout?`: `number`; \} |
| `params.maxSize?` | `number`                                          |
| `params.timeout?` | `number`                                          |

#### Returns

`Promise`\<`void`\>

---

### dispose()

```ts
dispose(): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:340

#### Returns

`void`

#### Overrides

[`ClerkBase`](../ClerkBase/README.md).[`dispose`](../ClerkBase/README.md#dispose)

---

### flush()

```ts
flush(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:314

#### Returns

`Promise`\<`void`\>

---

### onProgress()

```ts
onProgress(): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:87

#### Returns

`void`

#### Inherited from

[`ClerkBase`](../ClerkBase/README.md).[`onProgress`](../ClerkBase/README.md#onprogress)

---

### setOnProgress()

```ts
setOnProgress(callback: (state: ClerkStateDetail) => void): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:94

#### Parameters

| Parameter  | Type                                    |
| ---------- | --------------------------------------- |
| `callback` | (`state`: `ClerkStateDetail`) => `void` |

#### Returns

`void`

#### Inherited from

[`ClerkBase`](../ClerkBase/README.md).[`setOnProgress`](../ClerkBase/README.md#setonprogress)
