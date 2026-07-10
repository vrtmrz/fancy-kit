[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [bulk](../README.md) / BulkBase

# Abstract Class: BulkBase\<T, U\>

Defined in: [src/concurrency/bulk.ts:72](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L72)

Base class for batching or streaming items with concurrency control.

## Extended by

- [`Batcher`](../Batcher/README.md)
- [`Streamer`](../Streamer/README.md)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
| `U` |

## Constructors

### Constructor

```ts
new BulkBase<T, U>(ac?: AbortController): BulkBase<T, U>;
```

Defined in: [src/concurrency/bulk.ts:137](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L137)

Creates a BindBase instance.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `ac?` | `AbortController` | AbortController to abort the batching/streaming process |

#### Returns

`BulkBase`\<`T`, `U`\>

## Properties

| Property | Modifier | Type | Default value | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="ac"></a> `ac` | `protected` | `AbortController` | `undefined` | - | [src/concurrency/bulk.ts:73](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L73) |
| <a id="buffer"></a> `buffer` | `protected` | `T`[] | `[]` | - | [src/concurrency/bulk.ts:74](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L74) |
| <a id="freeflag"></a> `freeFlag` | `protected` | [`WaitSemaphore`](../WaitSemaphore/README.md) | `undefined` | Semaphore indicating whether items can be added (not full). | [src/concurrency/bulk.ts:84](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L84) |
| <a id="unlocked"></a> `unlocked` | `protected` | `boolean` | `false` | If true, disables the concurrency control (always yields immediately but no items can be added). | [src/concurrency/bulk.ts:89](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L89) |
| <a id="yieldflag"></a> `yieldFlag` | `protected` | [`WaitSemaphore`](../WaitSemaphore/README.md) | `undefined` | Semaphore indicating whether items can be yielded. | [src/concurrency/bulk.ts:79](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L79) |

## Accessors

### isAborted

#### Get Signature

```ts
get isAborted(): boolean;
```

Defined in: [src/concurrency/bulk.ts:103](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L103)

Indicates whether the process has been aborted.

##### Returns

`boolean`

***

### isBufferFull

#### Get Signature

```ts
get abstract isBufferFull(): boolean;
```

Defined in: [src/concurrency/bulk.ts:110](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L110)

Indicates whether the buffer is full (cannot add more items).

##### Returns

`boolean`

***

### isBufferReady

#### Get Signature

```ts
get abstract isBufferReady(): boolean;
```

Defined in: [src/concurrency/bulk.ts:115](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L115)

Indicates whether the buffer is ready to yield items.

##### Returns

`boolean`

## Methods

### abort()

```ts
abort(): void;
```

Defined in: [src/concurrency/bulk.ts:94](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L94)

Aborts the batching/streaming process.

#### Returns

`void`

***

### add()

```ts
add(item: T): Promise<void>;
```

Defined in: [src/concurrency/bulk.ts:203](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L203)

Adds an item to the buffer.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `item` | `T` | Item to add to the buffer |

#### Returns

`Promise`\<`void`\>

void

***

### addToBuffer()

```ts
protected addToBuffer(item: T): void;
```

Defined in: [src/concurrency/bulk.ts:192](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L192)

Adds an item to the buffer.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `item` | `T` | Item to add to the buffer |

#### Returns

`void`

***

### canYield()

```ts
canYield(items: U): boolean;
```

Defined in: [src/concurrency/bulk.ts:236](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L236)

Determines whether the yielded items can be yielded.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `items` | `U` | Items to be yielded |

#### Returns

`boolean`

True if the items can be yielded, false otherwise (skipped in yielding).

***

### checkFlags()

```ts
checkFlags(): void;
```

Defined in: [src/concurrency/bulk.ts:183](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L183)

Checks both flags.

#### Returns

`void`

***

### checkFree()

```ts
protected checkFree(): void;
```

Defined in: [src/concurrency/bulk.ts:148](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L148)

Checks the free flag and locks it if necessary.

#### Returns

`void`

void

***

### checkYielding()

```ts
protected checkYielding(): void;
```

Defined in: [src/concurrency/bulk.ts:166](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L166)

Checks the yielding flag and locks it if necessary.

#### Returns

`void`

void

***

### disableControl()

```ts
disableControl(): void;
```

Defined in: [src/concurrency/bulk.ts:120](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L120)

Disables the concurrency control.

#### Returns

`void`

***

### enableControl()

```ts
enableControl(): void;
```

Defined in: [src/concurrency/bulk.ts:128](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L128)

Enables the concurrency control.

#### Returns

`void`

***

### onAdd()

```ts
onAdd(): void;
```

Defined in: [src/concurrency/bulk.ts:250](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L250)

Hook called after adding an item.

#### Returns

`void`

***

### onYield()

```ts
onYield(): void;
```

Defined in: [src/concurrency/bulk.ts:243](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L243)

Hook called after yielding items.

#### Returns

`void`

***

### yield()

```ts
yield(): AsyncGenerator<U>;
```

Defined in: [src/concurrency/bulk.ts:217](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L217)

Yields items from the buffer as an async generator.

#### Returns

`AsyncGenerator`\<`U`\>

***

### yieldResult()

```ts
abstract yieldResult(): U;
```

Defined in: [src/concurrency/bulk.ts:212](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L212)

gets the result of yielding items from the buffer.

#### Returns

`U`
