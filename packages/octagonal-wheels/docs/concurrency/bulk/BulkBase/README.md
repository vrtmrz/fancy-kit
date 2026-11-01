[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [bulk](../README.md) / BulkBase

# Abstract Class: BulkBase\<T, U\>

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:72

Base class for batching or streaming items with concurrency control.

## Extended by

- [`Batcher`](../Batcher/README.md)
- [`Streamer`](../Streamer/README.md)

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |
| `U`            |

## Constructors

### Constructor

```ts
new BulkBase<T, U>(ac?: AbortController): BulkBase<T, U>;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:137

Creates a BindBase instance.

#### Parameters

| Parameter | Type              | Description                                             |
| --------- | ----------------- | ------------------------------------------------------- |
| `ac?`     | `AbortController` | AbortController to abort the batching/streaming process |

#### Returns

`BulkBase`\<`T`, `U`\>

## Properties

| Property                           | Modifier    | Type                                          | Default value | Description                                                                                      | Defined in                                           |
| ---------------------------------- | ----------- | --------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| <a id="ac"></a> `ac`               | `protected` | `AbortController`                             | `undefined`   | -                                                                                                | packages/octagonal-wheels/src/concurrency/bulk.ts:73 |
| <a id="buffer"></a> `buffer`       | `protected` | `T`[]                                         | `[]`          | -                                                                                                | packages/octagonal-wheels/src/concurrency/bulk.ts:74 |
| <a id="freeflag"></a> `freeFlag`   | `protected` | [`WaitSemaphore`](../WaitSemaphore/README.md) | `undefined`   | Semaphore indicating whether items can be added (not full).                                      | packages/octagonal-wheels/src/concurrency/bulk.ts:84 |
| <a id="unlocked"></a> `unlocked`   | `protected` | `boolean`                                     | `false`       | If true, disables the concurrency control (always yields immediately but no items can be added). | packages/octagonal-wheels/src/concurrency/bulk.ts:89 |
| <a id="yieldflag"></a> `yieldFlag` | `protected` | [`WaitSemaphore`](../WaitSemaphore/README.md) | `undefined`   | Semaphore indicating whether items can be yielded.                                               | packages/octagonal-wheels/src/concurrency/bulk.ts:79 |

## Accessors

### isAborted

#### Get Signature

```ts
get isAborted(): boolean;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:103

Indicates whether the process has been aborted.

##### Returns

`boolean`

---

### isBufferFull

#### Get Signature

```ts
get abstract isBufferFull(): boolean;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:110

Indicates whether the buffer is full (cannot add more items).

##### Returns

`boolean`

---

### isBufferReady

#### Get Signature

```ts
get abstract isBufferReady(): boolean;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:115

Indicates whether the buffer is ready to yield items.

##### Returns

`boolean`

## Methods

### abort()

```ts
abort(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:94

Aborts the batching/streaming process.

#### Returns

`void`

---

### add()

```ts
add(item: T): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:203

Adds an item to the buffer.

#### Parameters

| Parameter | Type | Description               |
| --------- | ---- | ------------------------- |
| `item`    | `T`  | Item to add to the buffer |

#### Returns

`Promise`\<`void`\>

void

---

### addToBuffer()

```ts
protected addToBuffer(item: T): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:192

Adds an item to the buffer.

#### Parameters

| Parameter | Type | Description               |
| --------- | ---- | ------------------------- |
| `item`    | `T`  | Item to add to the buffer |

#### Returns

`void`

---

### canYield()

```ts
canYield(items: U): boolean;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:236

Determines whether the yielded items can be yielded.

#### Parameters

| Parameter | Type | Description         |
| --------- | ---- | ------------------- |
| `items`   | `U`  | Items to be yielded |

#### Returns

`boolean`

True if the items can be yielded, false otherwise (skipped in yielding).

---

### checkFlags()

```ts
checkFlags(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:183

Checks both flags.

#### Returns

`void`

---

### checkFree()

```ts
protected checkFree(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:148

Checks the free flag and locks it if necessary.

#### Returns

`void`

void

---

### checkYielding()

```ts
protected checkYielding(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:166

Checks the yielding flag and locks it if necessary.

#### Returns

`void`

void

---

### disableControl()

```ts
disableControl(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:120

Disables the concurrency control.

#### Returns

`void`

---

### enableControl()

```ts
enableControl(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:128

Enables the concurrency control.

#### Returns

`void`

---

### onAdd()

```ts
onAdd(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:250

Hook called after adding an item.

#### Returns

`void`

---

### onYield()

```ts
onYield(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:243

Hook called after yielding items.

#### Returns

`void`

---

### yield()

```ts
yield(): AsyncGenerator<U>;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:217

Yields items from the buffer as an async generator.

#### Returns

`AsyncGenerator`\<`U`\>

---

### yieldResult()

```ts
abstract yieldResult(): U;
```

Defined in: packages/octagonal-wheels/src/concurrency/bulk.ts:212

gets the result of yielding items from the buffer.

#### Returns

`U`
