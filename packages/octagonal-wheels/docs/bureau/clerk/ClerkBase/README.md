[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [bureau](../../README.md) / [clerk](../README.md) / ClerkBase

# Abstract Class: ClerkBase\<T\>

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:46

## Extended by

- [`Clerk`](../Clerk/README.md)
- [`Porter`](../Porter/README.md)
- [`Harvester`](../Harvester/README.md)

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Constructors

### Constructor

```ts
new ClerkBase<T>(params: ClerkOptionBase<T>): ClerkBase<T>;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:62

#### Parameters

| Parameter | Type                                                     |
| --------- | -------------------------------------------------------- |
| `params`  | [`ClerkOptionBase`](../ClerkOptionBase/README.md)\<`T`\> |

#### Returns

`ClerkBase`\<`T`\>

## Properties

| Property                                       | Type                                                                                                                                             | Default value        | Defined in                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ------------------------------------------------ |
| <a id="_disposed"></a> `_disposed`             | `boolean`                                                                                                                                        | `false`              | packages/octagonal-wheels/src/bureau/Clerk.ts:57 |
| <a id="_disposepromise"></a> `_disposePromise` | \{ `promise`: `Promise`\<`void`\>; `reject`: (`reason?`: `any`) => `void`; `resolve`: (`value`: `void` \| `PromiseLike`\<`void`\>) => `void`; \} | `undefined`          | packages/octagonal-wheels/src/bureau/Clerk.ts:58 |
| `_disposePromise.promise`                      | `Promise`\<`void`\>                                                                                                                              | `undefined`          | packages/octagonal-wheels/src/promises.ts:67     |
| `_disposePromise.reject`                       | (`reason?`: `any`) => `void`                                                                                                                     | `undefined`          | packages/octagonal-wheels/src/promises.ts:67     |
| `_disposePromise.resolve`                      | (`value`: `void` \| `PromiseLike`\<`void`\>) => `void`                                                                                           | `undefined`          | packages/octagonal-wheels/src/promises.ts:67     |
| <a id="_inbox"></a> `_inbox`                   | [`Inbox`](../../inbox/Inbox/README.md)\<`T`\>                                                                                                    | `undefined`          | packages/octagonal-wheels/src/bureau/Clerk.ts:47 |
| <a id="_name"></a> `_name`                     | `string`                                                                                                                                         | `undefined`          | packages/octagonal-wheels/src/bureau/Clerk.ts:48 |
| <a id="_onprogress"></a> `_onProgress?`        | (`state`: `ClerkStateDetail`) => `void`                                                                                                          | `undefined`          | packages/octagonal-wheels/src/bureau/Clerk.ts:85 |
| <a id="_state"></a> `_state`                   | [`ClerkState`](../ClerkState/README.md)                                                                                                          | `ClerkState.STALLED` | packages/octagonal-wheels/src/bureau/Clerk.ts:52 |
| <a id="_totalfailed"></a> `_totalFailed`       | `number`                                                                                                                                         | `0`                  | packages/octagonal-wheels/src/bureau/Clerk.ts:55 |
| <a id="_totalfetched"></a> `_totalFetched`     | `number`                                                                                                                                         | `0`                  | packages/octagonal-wheels/src/bureau/Clerk.ts:56 |
| <a id="_totalprocessed"></a> `_totalProcessed` | `number`                                                                                                                                         | `0`                  | packages/octagonal-wheels/src/bureau/Clerk.ts:53 |
| <a id="_totalsuccess"></a> `_totalSuccess`     | `number`                                                                                                                                         | `0`                  | packages/octagonal-wheels/src/bureau/Clerk.ts:54 |

## Accessors

### onDisposed

#### Get Signature

```ts
get onDisposed(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:152

##### Returns

`Promise`\<`void`\>

---

### state

#### Get Signature

```ts
get state(): ClerkState;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:59

##### Returns

[`ClerkState`](../ClerkState/README.md)

---

### stateDetail

#### Get Signature

```ts
get stateDetail(): ClerkStateDetail;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:69

##### Returns

`ClerkStateDetail`

## Methods

### \_mainLoop()

```ts
_mainLoop(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:97

#### Returns

`Promise`\<`void`\>

---

### \_onPick()

```ts
abstract _onPick(item: T): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:49

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `item`    | `T`  |

#### Returns

`Promise`\<`void`\>

---

### \_onSentinel()?

```ts
optional _onSentinel(item: SENTINELS): Promise<any>;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:50

#### Parameters

| Parameter | Type                                  |
| --------- | ------------------------------------- |
| `item`    | [`SENTINELS`](../SENTINELS/README.md) |

#### Returns

`Promise`\<`any`\>

---

### dispose()

```ts
dispose(): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:146

#### Returns

`void`

---

### onProgress()

```ts
onProgress(): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:87

#### Returns

`void`

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
