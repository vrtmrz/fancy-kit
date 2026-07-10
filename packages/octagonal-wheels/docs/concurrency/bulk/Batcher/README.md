[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [bulk](../README.md) / Batcher

# Class: Batcher\<T\>

Defined in: [src/concurrency/bulk.ts:273](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L273)

Batches items and yields them as arrays of a specified size.
It respects a maximum capacity for the buffer and can be controlled with an AbortController.

## Extends

- [`BulkBase`](../BulkBase/README.md)\<`T`, `T`[]\>

## Extended by

- [`BatcherWithTimeout`](../BatcherWithTimeout/README.md)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Constructors

### Constructor

```ts
new Batcher<T>(param0: BatcherOptions, ac?: AbortController): Batcher<T>;
```

Defined in: [src/concurrency/bulk.ts:286](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L286)

Creates an instance of the Batcher class.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `param0` | [`BatcherOptions`](../BatcherOptions/README.md) | Options for the batcher. |
| `ac?` | `AbortController` | AbortController to control the batcher. |

#### Returns

`Batcher`\<`T`\>

#### Overrides

[`BulkBase`](../BulkBase/README.md).[`constructor`](../BulkBase/README.md#constructor)

## Properties

| Property | Modifier | Type | Default value | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="ac"></a> `ac` | `protected` | `AbortController` | `undefined` | - | [`BulkBase`](../BulkBase/README.md).[`ac`](../BulkBase/README.md#ac) | [src/concurrency/bulk.ts:73](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L73) |
| <a id="buffer"></a> `buffer` | `protected` | `T`[] | `[]` | - | [`BulkBase`](../BulkBase/README.md).[`buffer`](../BulkBase/README.md#buffer) | [src/concurrency/bulk.ts:74](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L74) |
| <a id="freeflag"></a> `freeFlag` | `protected` | [`WaitSemaphore`](../WaitSemaphore/README.md) | `undefined` | Semaphore indicating whether items can be added (not full). | [`BulkBase`](../BulkBase/README.md).[`freeFlag`](../BulkBase/README.md#freeflag) | [src/concurrency/bulk.ts:84](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L84) |
| <a id="unlocked"></a> `unlocked` | `protected` | `boolean` | `false` | If true, disables the concurrency control (always yields immediately but no items can be added). | [`BulkBase`](../BulkBase/README.md).[`unlocked`](../BulkBase/README.md#unlocked) | [src/concurrency/bulk.ts:89](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L89) |
| <a id="yieldflag"></a> `yieldFlag` | `protected` | [`WaitSemaphore`](../WaitSemaphore/README.md) | `undefined` | Semaphore indicating whether items can be yielded. | [`BulkBase`](../BulkBase/README.md).[`yieldFlag`](../BulkBase/README.md#yieldflag) | [src/concurrency/bulk.ts:79](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L79) |

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

[`BulkBase`](../BulkBase/README.md).[`isAborted`](../BulkBase/README.md#isaborted)

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

#### Overrides

[`BulkBase`](../BulkBase/README.md).[`isBufferFull`](../BulkBase/README.md#isbufferfull)

***

### isBufferReady

#### Get Signature

```ts
get isBufferReady(): boolean;
```

Defined in: [src/concurrency/bulk.ts:292](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L292)

Indicates whether the buffer is ready to yield items.

##### Returns

`boolean`

#### Overrides

[`BulkBase`](../BulkBase/README.md).[`isBufferReady`](../BulkBase/README.md#isbufferready)

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

[`BulkBase`](../BulkBase/README.md).[`abort`](../BulkBase/README.md#abort)

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

[`BulkBase`](../BulkBase/README.md).[`add`](../BulkBase/README.md#add)

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

[`BulkBase`](../BulkBase/README.md).[`addToBuffer`](../BulkBase/README.md#addtobuffer)

***

### canYield()

```ts
canYield(items: T[]): boolean;
```

Defined in: [src/concurrency/bulk.ts:236](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L236)

Determines whether the yielded items can be yielded.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `items` | `T`[] | Items to be yielded |

#### Returns

`boolean`

True if the items can be yielded, false otherwise (skipped in yielding).

#### Inherited from

[`BulkBase`](../BulkBase/README.md).[`canYield`](../BulkBase/README.md#canyield)

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

[`BulkBase`](../BulkBase/README.md).[`checkFlags`](../BulkBase/README.md#checkflags)

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

[`BulkBase`](../BulkBase/README.md).[`checkFree`](../BulkBase/README.md#checkfree)

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

[`BulkBase`](../BulkBase/README.md).[`checkYielding`](../BulkBase/README.md#checkyielding)

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

[`BulkBase`](../BulkBase/README.md).[`disableControl`](../BulkBase/README.md#disablecontrol)

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

[`BulkBase`](../BulkBase/README.md).[`enableControl`](../BulkBase/README.md#enablecontrol)

***

### onAdd()

```ts
onAdd(): void;
```

Defined in: [src/concurrency/bulk.ts:250](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L250)

Hook called after adding an item.

#### Returns

`void`

#### Inherited from

[`BulkBase`](../BulkBase/README.md).[`onAdd`](../BulkBase/README.md#onadd)

***

### onYield()

```ts
onYield(): void;
```

Defined in: [src/concurrency/bulk.ts:243](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L243)

Hook called after yielding items.

#### Returns

`void`

#### Inherited from

[`BulkBase`](../BulkBase/README.md).[`onYield`](../BulkBase/README.md#onyield)

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

[`BulkBase`](../BulkBase/README.md).[`yield`](../BulkBase/README.md#yield)

***

### yieldResult()

```ts
yieldResult(): T[];
```

Defined in: [src/concurrency/bulk.ts:296](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/bulk.ts#L296)

gets the result of yielding items from the buffer.

#### Returns

`T`[]

#### Overrides

[`BulkBase`](../BulkBase/README.md).[`yieldResult`](../BulkBase/README.md#yieldresult)
