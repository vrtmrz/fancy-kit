[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [bureau](../../README.md) / [inbox](../README.md) / Inbox

# Class: Inbox\<T\>

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:178

## Extends

- [`SyncInbox`](../SyncInbox/README.md)\<`T`\>

## Extended by

- [`InboxWithEvent`](../InboxWithEvent/README.md)

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Constructors

### Constructor

```ts
new Inbox<T>(capacity: number): Inbox<T>;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:186

Creates a new PostBox.

#### Parameters

| Parameter  | Type     | Description                 |
| ---------- | -------- | --------------------------- |
| `capacity` | `number` | The capacity of the buffer. |

#### Returns

`Inbox`\<`T`\>

#### Overrides

[`SyncInbox`](../SyncInbox/README.md).[`constructor`](../SyncInbox/README.md#constructor)

## Properties

| Property                                         | Type                                                                                                                                                             | Default value | Inherited from                                                                                      | Defined in                                        |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| <a id="_buffer"></a> `_buffer`                   | `T`[]                                                                                                                                                            | `undefined`   | [`SyncInbox`](../SyncInbox/README.md).[`_buffer`](../SyncInbox/README.md#_buffer)                   | packages/octagonal-wheels/src/bureau/Inbox.ts:15  |
| <a id="_capacity"></a> `_capacity`               | `number`                                                                                                                                                         | `undefined`   | [`SyncInbox`](../SyncInbox/README.md).[`_capacity`](../SyncInbox/README.md#_capacity)               | packages/octagonal-wheels/src/bureau/Inbox.ts:14  |
| <a id="_disposedpromise"></a> `_disposedPromise` | [`PromiseWithResolvers`](../../../promises/PromiseWithResolvers/README.md)\<`void`\>                                                                             | `undefined`   | [`SyncInbox`](../SyncInbox/README.md).[`_disposedPromise`](../SyncInbox/README.md#_disposedpromise) | packages/octagonal-wheels/src/bureau/Inbox.ts:21  |
| <a id="_isdisposed"></a> `_isDisposed`           | `boolean`                                                                                                                                                        | `false`       | [`SyncInbox`](../SyncInbox/README.md).[`_isDisposed`](../SyncInbox/README.md#_isdisposed)           | packages/octagonal-wheels/src/bureau/Inbox.ts:20  |
| <a id="_lockfull"></a> `_lockFull`               | \| [`PromiseWithResolvers`](../../../promises/PromiseWithResolvers/README.md)\<_typeof_ [`READY_POST_SIGNAL`](../READY_POST_SIGNAL-1/README.md)\> \| `undefined` | `undefined`   | -                                                                                                   | packages/octagonal-wheels/src/bureau/Inbox.ts:179 |
| <a id="_lockready"></a> `_lockReady`             | \| [`PromiseWithResolvers`](../../../promises/PromiseWithResolvers/README.md)\<_typeof_ [`READY_PICK_SIGNAL`](../READY_PICK_SIGNAL-1/README.md)\> \| `undefined` | `undefined`   | -                                                                                                   | packages/octagonal-wheels/src/bureau/Inbox.ts:180 |
| <a id="_readidx"></a> `_readIdx`                 | `number`                                                                                                                                                         | `0`           | [`SyncInbox`](../SyncInbox/README.md).[`_readIdx`](../SyncInbox/README.md#_readidx)                 | packages/octagonal-wheels/src/bureau/Inbox.ts:18  |
| <a id="_wraparoundcount"></a> `_wrapAroundCount` | `number`                                                                                                                                                         | `0`           | [`SyncInbox`](../SyncInbox/README.md).[`_wrapAroundCount`](../SyncInbox/README.md#_wraparoundcount) | packages/octagonal-wheels/src/bureau/Inbox.ts:19  |
| <a id="_writeidx"></a> `_writeIdx`               | `number`                                                                                                                                                         | `0`           | [`SyncInbox`](../SyncInbox/README.md).[`_writeIdx`](../SyncInbox/README.md#_writeidx)               | packages/octagonal-wheels/src/bureau/Inbox.ts:17  |

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

#### Inherited from

[`SyncInbox`](../SyncInbox/README.md).[`free`](../SyncInbox/README.md#free)

---

### isDisposed

#### Get Signature

```ts
get isDisposed(): boolean;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:78

##### Returns

`boolean`

#### Inherited from

[`SyncInbox`](../SyncInbox/README.md).[`isDisposed`](../SyncInbox/README.md#isdisposed)

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

#### Inherited from

[`SyncInbox`](../SyncInbox/README.md).[`isFull`](../SyncInbox/README.md#isfull)

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

#### Inherited from

[`SyncInbox`](../SyncInbox/README.md).[`isReady`](../SyncInbox/README.md#isready)

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

#### Inherited from

[`SyncInbox`](../SyncInbox/README.md).[`isRunningOut`](../SyncInbox/README.md#isrunningout)

---

### onDisposed

#### Get Signature

```ts
get onDisposed(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:81

##### Returns

`Promise`\<`void`\>

#### Inherited from

[`SyncInbox`](../SyncInbox/README.md).[`onDisposed`](../SyncInbox/README.md#ondisposed)

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

#### Inherited from

[`SyncInbox`](../SyncInbox/README.md).[`size`](../SyncInbox/README.md#size)

---

### state

#### Get Signature

```ts
get state(): InboxStateDetail;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:96

##### Returns

[`InboxStateDetail`](../InboxStateDetail/README.md)

#### Inherited from

[`SyncInbox`](../SyncInbox/README.md).[`state`](../SyncInbox/README.md#state)

## Methods

### \_\_fixIdx()

```ts
__fixIdx(): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:85

#### Returns

`void`

#### Inherited from

[`SyncInbox`](../SyncInbox/README.md).[`__fixIdx`](../SyncInbox/README.md#__fixidx)

---

### \_\_onPicked()

```ts
__onPicked(): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:223

#### Returns

`void`

#### Overrides

[`SyncInbox`](../SyncInbox/README.md).[`__onPicked`](../SyncInbox/README.md#__onpicked)

---

### \_\_onPosted()

```ts
__onPosted(): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:219

#### Returns

`void`

#### Overrides

[`SyncInbox`](../SyncInbox/README.md).[`__onPosted`](../SyncInbox/README.md#__onposted)

---

### \_\_onProgress()

```ts
__onProgress(): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:127

#### Returns

`void`

#### Inherited from

[`SyncInbox`](../SyncInbox/README.md).[`__onProgress`](../SyncInbox/README.md#__onprogress)

---

### \_notifyFree()

```ts
_notifyFree(): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:200

#### Returns

`void`

---

### \_notifyReady()

```ts
_notifyReady(): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:215

#### Returns

`void`

---

### \_waitForFree()

```ts
_waitForFree(): Promise<typeof READY_POST_SIGNAL>;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:190

#### Returns

`Promise`\<_typeof_ [`READY_POST_SIGNAL`](../READY_POST_SIGNAL-1/README.md)\>

---

### \_waitForReady()

```ts
_waitForReady(): Promise<typeof READY_PICK_SIGNAL>;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:205

#### Returns

`Promise`\<_typeof_ [`READY_PICK_SIGNAL`](../READY_PICK_SIGNAL-1/README.md)\>

---

### dispose()

```ts
dispose(): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:228

#### Returns

`void`

#### Overrides

[`SyncInbox`](../SyncInbox/README.md).[`dispose`](../SyncInbox/README.md#dispose)

---

### pick()

```ts
pick(timeout?: number, cancellation?: Promise<any>[]): Promise<typeof NOT_AVAILABLE | T>;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:293

Picks an item from the buffer.
Waits until an item is available.

#### Parameters

| Parameter       | Type                 | Description                             |
| --------------- | -------------------- | --------------------------------------- |
| `timeout?`      | `number`             | The timeout in milliseconds.            |
| `cancellation?` | `Promise`\<`any`\>[] | The promise that cancels the operation. |

#### Returns

`Promise`\<_typeof_ [`NOT_AVAILABLE`](../NOT_AVAILABLE-1/README.md) \| `T`\>

The item picked.

---

### post()

```ts
post(
   item: T,
   timeout?: number,
cancellation?: Promise<any>[]): Promise<boolean>;
```

Defined in: packages/octagonal-wheels/src/bureau/Inbox.ts:248

Posts an item to the buffer.
Waits until a slot is available.

#### Parameters

| Parameter       | Type                 | Description                             |
| --------------- | -------------------- | --------------------------------------- |
| `item`          | `T`                  | The item to post.                       |
| `timeout?`      | `number`             | The timeout in milliseconds.            |
| `cancellation?` | `Promise`\<`any`\>[] | The promise that cancels the operation. |

#### Returns

`Promise`\<`boolean`\>

whether the item is posted.

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

#### Inherited from

[`SyncInbox`](../SyncInbox/README.md).[`tryCancelPost`](../SyncInbox/README.md#trycancelpost)

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

#### Inherited from

[`SyncInbox`](../SyncInbox/README.md).[`tryPick`](../SyncInbox/README.md#trypick)

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

#### Inherited from

[`SyncInbox`](../SyncInbox/README.md).[`tryPost`](../SyncInbox/README.md#trypost)
