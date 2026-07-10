[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [bulk](../README.md) / BatcherWithTimeout

# Class: BatcherWithTimeout\<T\>

Defined in: [src/concurrency/bulk.ts:320](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L320)

Batches items and yields them as arrays of a specified size or after a timeout.
It respects a maximum capacity for the buffer and can be controlled with an AbortController.

## Extends

- [`Batcher`](../Batcher/README.md)\<`T`\>

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Constructors

### Constructor

```ts
new BatcherWithTimeout<T>(__namedParameters: BatcherWithTimeoutOptions, ac?: AbortController): BatcherWithTimeout<T>;
```

Defined in: [src/concurrency/bulk.ts:331](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L331)

Options for the batcher with timeout.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `__namedParameters` | [`BatcherWithTimeoutOptions`](../BatcherWithTimeoutOptions/README.md) | - |
| `ac?` | `AbortController` | AbortController to control the batcher. |

#### Returns

`BatcherWithTimeout`\<`T`\>

#### Overrides

[`Batcher`](../Batcher/README.md).[`constructor`](../Batcher/README.md#constructor)

## Properties

| Property | Modifier | Type | Default value | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="ac"></a> `ac` | `protected` | `AbortController` | `undefined` | - | [`Batcher`](../Batcher/README.md).[`ac`](../Batcher/README.md#ac) | [src/concurrency/bulk.ts:73](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L73) |
| <a id="buffer"></a> `buffer` | `protected` | `T`[] | `[]` | - | [`Batcher`](../Batcher/README.md).[`buffer`](../Batcher/README.md#buffer) | [src/concurrency/bulk.ts:74](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L74) |
| <a id="freeflag"></a> `freeFlag` | `protected` | [`WaitSemaphore`](../WaitSemaphore/README.md) | `undefined` | Semaphore indicating whether items can be added (not full). | [`Batcher`](../Batcher/README.md).[`freeFlag`](../Batcher/README.md#freeflag) | [src/concurrency/bulk.ts:84](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L84) |
| <a id="unlocked"></a> `unlocked` | `protected` | `boolean` | `false` | If true, disables the concurrency control (always yields immediately but no items can be added). | [`Batcher`](../Batcher/README.md).[`unlocked`](../Batcher/README.md#unlocked) | [src/concurrency/bulk.ts:89](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L89) |
| <a id="yieldflag"></a> `yieldFlag` | `protected` | [`WaitSemaphore`](../WaitSemaphore/README.md) | `undefined` | Semaphore indicating whether items can be yielded. | [`Batcher`](../Batcher/README.md).[`yieldFlag`](../Batcher/README.md#yieldflag) | [src/concurrency/bulk.ts:79](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L79) |

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

#### Inherited from

[`Batcher`](../Batcher/README.md).[`isAborted`](../Batcher/README.md#isaborted)

***

### isBufferFull

#### Get Signature

```ts
get isBufferFull(): boolean;
```

Defined in: [src/concurrency/bulk.ts:277](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L277)

Indicates whether the buffer is full (cannot add more items).

##### Returns

`boolean`

#### Inherited from

[`Batcher`](../Batcher/README.md).[`isBufferFull`](../Batcher/README.md#isbufferfull)

***

### isBufferReady

#### Get Signature

```ts
get isBufferReady(): boolean;
```

Defined in: [src/concurrency/bulk.ts:340](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L340)

Indicates whether the buffer is ready to yield items.

##### Returns

`boolean`

#### Overrides

[`Batcher`](../Batcher/README.md).[`isBufferReady`](../Batcher/README.md#isbufferready)

## Methods

### abort()

```ts
abort(): void;
```

Defined in: [src/concurrency/bulk.ts:94](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L94)

Aborts the batching/streaming process.

#### Returns

`void`

#### Inherited from

[`Batcher`](../Batcher/README.md).[`abort`](../Batcher/README.md#abort)

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

#### Inherited from

[`Batcher`](../Batcher/README.md).[`add`](../Batcher/README.md#add)

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

#### Inherited from

[`Batcher`](../Batcher/README.md).[`addToBuffer`](../Batcher/README.md#addtobuffer)

***

### canYield()

```ts
canYield(items: T[]): boolean;
```

Defined in: [src/concurrency/bulk.ts:377](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L377)

Checks if the items can be yielded.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `items` | `T`[] | Items to be yielded |

#### Returns

`boolean`

non-empty array means can yield, empty array means cannot yield (skip yielding).

#### Overrides

[`Batcher`](../Batcher/README.md).[`canYield`](../Batcher/README.md#canyield)

***

### checkFlags()

```ts
checkFlags(): void;
```

Defined in: [src/concurrency/bulk.ts:183](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L183)

Checks both flags.

#### Returns

`void`

#### Inherited from

[`Batcher`](../Batcher/README.md).[`checkFlags`](../Batcher/README.md#checkflags)

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

#### Inherited from

[`Batcher`](../Batcher/README.md).[`checkFree`](../Batcher/README.md#checkfree)

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

#### Inherited from

[`Batcher`](../Batcher/README.md).[`checkYielding`](../Batcher/README.md#checkyielding)

***

### disableControl()

```ts
disableControl(): void;
```

Defined in: [src/concurrency/bulk.ts:120](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L120)

Disables the concurrency control.

#### Returns

`void`

#### Inherited from

[`Batcher`](../Batcher/README.md).[`disableControl`](../Batcher/README.md#disablecontrol)

***

### enableControl()

```ts
enableControl(): void;
```

Defined in: [src/concurrency/bulk.ts:128](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L128)

Enables the concurrency control.

#### Returns

`void`

#### Inherited from

[`Batcher`](../Batcher/README.md).[`enableControl`](../Batcher/README.md#enablecontrol)

***

### onAdd()

```ts
onAdd(): void;
```

Defined in: [src/concurrency/bulk.ts:381](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L381)

Hook called after adding an item.

#### Returns

`void`

#### Overrides

[`Batcher`](../Batcher/README.md).[`onAdd`](../Batcher/README.md#onadd)

***

### onYield()

```ts
onYield(): void;
```

Defined in: [src/concurrency/bulk.ts:386](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L386)

Hook called after yielding items.

#### Returns

`void`

#### Overrides

[`Batcher`](../Batcher/README.md).[`onYield`](../Batcher/README.md#onyield)

***

### triggerTimeoutAdd()

```ts
triggerTimeoutAdd(): void;
```

Defined in: [src/concurrency/bulk.ts:348](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L348)

Triggers the timeout for adding items.

#### Returns

`void`

void

***

### triggerTimeoutYield()

```ts
triggerTimeoutYield(): void;
```

Defined in: [src/concurrency/bulk.ts:362](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L362)

Triggers the timeout for yielding items.

#### Returns

`void`

void

***

### yield()

```ts
yield(): AsyncGenerator<T[]>;
```

Defined in: [src/concurrency/bulk.ts:217](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L217)

Yields items from the buffer as an async generator.

#### Returns

`AsyncGenerator`\<`T`[]\>

#### Inherited from

[`Batcher`](../Batcher/README.md).[`yield`](../Batcher/README.md#yield)

***

### yieldResult()

```ts
yieldResult(): T[];
```

Defined in: [src/concurrency/bulk.ts:296](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L296)

gets the result of yielding items from the buffer.

#### Returns

`T`[]

#### Inherited from

[`Batcher`](../Batcher/README.md).[`yieldResult`](../Batcher/README.md#yieldresult)
