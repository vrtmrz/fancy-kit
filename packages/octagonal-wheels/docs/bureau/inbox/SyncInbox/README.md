[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [bureau](../../README.md) / [inbox](../README.md) / SyncInbox

# Class: SyncInbox\<T\>

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:13

## Extended by

- [`Inbox`](../Inbox/README.md)

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Constructors

### Constructor

```ts
new SyncInbox<T>(capacity: number): SyncInbox<T>;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:22

#### Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `capacity` | `number` |

#### Returns

`SyncInbox`\<`T`\>

## Properties

| Property                                         | Type                                                                                 | Default value | Defined in                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------- | ------------------------------------------------ |
| <a id="_buffer"></a> `_buffer`                   | `T`[]                                                                                | `undefined`   | packages/octagonal-wheels/src/bureau/Inbox.ts:15 |
| <a id="_capacity"></a> `_capacity`               | `number`                                                                             | `undefined`   | packages/octagonal-wheels/src/bureau/Inbox.ts:14 |
| <a id="_disposedpromise"></a> `_disposedPromise` | [`PromiseWithResolvers`](../../../promises/PromiseWithResolvers/README.md)\<`void`\> | `undefined`   | packages/octagonal-wheels/src/bureau/Inbox.ts:21 |
| <a id="_isdisposed"></a> `_isDisposed`           | `boolean`                                                                            | `false`       | packages/octagonal-wheels/src/bureau/Inbox.ts:20 |
| <a id="_readidx"></a> `_readIdx`                 | `number`                                                                             | `0`           | packages/octagonal-wheels/src/bureau/Inbox.ts:18 |
| <a id="_wraparoundcount"></a> `_wrapAroundCount` | `number`                                                                             | `0`           | packages/octagonal-wheels/src/bureau/Inbox.ts:19 |
| <a id="_writeidx"></a> `_writeIdx`               | `number`                                                                             | `0`           | packages/octagonal-wheels/src/bureau/Inbox.ts:17 |

## Accessors

### free

#### Get Signature

```ts
get free(): number;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:53

The number of free slots in the buffer.

##### Returns

`number`

---

### isDisposed

#### Get Signature

```ts
get isDisposed(): boolean;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:78

##### Returns

`boolean`

---

### isFull

#### Get Signature

```ts
get isFull(): boolean;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:67

Whether the buffer is full.

##### Returns

`boolean`

---

### isReady

#### Get Signature

```ts
get isReady(): boolean;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:74

Whether the buffer is ready to be picked.

##### Returns

`boolean`

---

### isRunningOut

#### Get Signature

```ts
get isRunningOut(): boolean;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:60

Whether the buffer is running out.

##### Returns

`boolean`

---

### onDisposed

#### Get Signature

```ts
get onDisposed(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:81

##### Returns

`Promise`\<`void`\>

---

### size

#### Get Signature

```ts
get size(): number;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:47

The number of items in the buffer.

##### Returns

`number`

---

### state

#### Get Signature

```ts
get state(): InboxStateDetail;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:96

##### Returns

[`InboxStateDetail`](../InboxStateDetail/README.md)

## Methods

### \_\_fixIdx()

```ts
__fixIdx(): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:85

#### Returns

`void`

---

### \_\_onPicked()

```ts
__onPicked(): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:123

#### Returns

`void`

---

### \_\_onPosted()

```ts
__onPosted(): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:119

#### Returns

`void`

---

### \_\_onProgress()

```ts
__onProgress(): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:127

#### Returns

`void`

---

### dispose()

```ts
dispose(): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:107

#### Returns

`void`

---

### tryCancelPost()

```ts
tryCancelPost(): typeof NOT_AVAILABLE | T;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:150

Tries to cancel the last posted item.

#### Returns

_typeof_ [`NOT_AVAILABLE`](../NOT_AVAILABLE-1/README.md) \| `T`

The item picked, or `NOT_AVAILABLE` if no item is available.

---

### tryPick()

```ts
tryPick(): typeof NOT_AVAILABLE | T;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:166

Tries to pick an item from the buffer.

#### Returns

_typeof_ [`NOT_AVAILABLE`](../NOT_AVAILABLE-1/README.md) \| `T`

The item picked, or `NOT_AVAILABLE` if no item is available.

---

### tryPost()

```ts
tryPost(item: T): boolean;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:136

Tries to post an item to the buffer.

#### Parameters

| Parameter | Type | Description       |
| --------- | ---- | ----------------- |
| `item`    | `T`  | The item to post. |

#### Returns

`boolean`

whether the item is posted. `false` if the buffer is full.
