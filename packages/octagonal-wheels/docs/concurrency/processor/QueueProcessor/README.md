[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [processor](../README.md) / QueueProcessor

# Class: QueueProcessor\<T, U\>

Defined in: [src/concurrency/processor\_v2.ts:102](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L102)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
| `U` |

## Constructors

### Constructor

```ts
new QueueProcessor<T, U>(
   processor: Processor<T, U>, 
   params?: ProcessorParams<U>, 
   items?: T[], 
enqueueProcessor?: (queue: T[], newEntity: T) => T[]): QueueProcessor<T, U>;
```

Defined in: [src/concurrency/processor\_v2.ts:277](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L277)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `processor` | `Processor`\<`T`, `U`\> |
| `params?` | `ProcessorParams`\<`U`\> |
| `items?` | `T`[] |
| `enqueueProcessor?` | (`queue`: `T`[], `newEntity`: `T`) => `T`[] |

#### Returns

`QueueProcessor`\<`T`, `U`\>

## Properties

| Property | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="_clerks"></a> `_clerks` | [`ClerkGroup`](../../../bureau/clerk/ClerkGroup/README.md)\<`T`[], [`Clerk`](../../../bureau/clerk/Clerk/README.md)\<`T`[]\>\> | `undefined` | [src/concurrency/processor\_v2.ts:524](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L524) |
| <a id="_collected"></a> `_collected` | [`Inbox`](../../../bureau/inbox/Inbox/README.md)\<`T`[]\> | `undefined` | [src/concurrency/processor\_v2.ts:523](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L523) |
| <a id="_delaytimer"></a> `_delayTimer?` | `Timeout` | `undefined` | [src/concurrency/processor\_v2.ts:273](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L273) |
| <a id="_enqueueprocessor"></a> `_enqueueProcessor` | (`queue`: `T`[], `newEntity`: `T`) => `T`[] | `undefined` | [src/concurrency/processor\_v2.ts:105](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L105) |
| <a id="_hub"></a> `_hub` | [`EventHub`](../../../events/EventHub/README.md)\<`ProcessorEvents`\> | `undefined` | [src/concurrency/processor\_v2.ts:144](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L144) |
| <a id="_intervalpacemaker"></a> `_intervalPaceMaker` | [`PaceMaker`](../../../bureau/pacemaker/PaceMaker/README.md) | `undefined` | [src/concurrency/processor\_v2.ts:275](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L275) |
| <a id="_issuspended"></a> `_isSuspended` | `boolean` | `true` | [src/concurrency/processor\_v2.ts:106](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L106) |
| <a id="_keepresultuntildownstreamconnected"></a> `_keepResultUntilDownstreamConnected` | `boolean` | `false` | [src/concurrency/processor\_v2.ts:115](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L115) |
| <a id="_keptresult"></a> `_keptResult` | `U`[] | `undefined` | [src/concurrency/processor\_v2.ts:116](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L116) |
| <a id="_nextprocessneedsimmediate"></a> `_nextProcessNeedsImmediate` | `boolean` | `false` | [src/concurrency/processor\_v2.ts:107](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L107) |
| <a id="_pipeto"></a> `_pipeTo?` | `QueueProcessor`\<`U`, `any`\> | `undefined` | [src/concurrency/processor\_v2.ts:109](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L109) |
| <a id="_processcount"></a> `_processCount` | `number` | `0` | [src/concurrency/processor\_v2.ts:525](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L525) |
| <a id="_processing"></a> `_processing` | `boolean` | `false` | [src/concurrency/processor\_v2.ts:521](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L521) |
| <a id="_processingbatches"></a> `_processingBatches` | `Set`\<`number`\> | `undefined` | [src/concurrency/processor\_v2.ts:510](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L510) |
| <a id="_processingentitiesreactivesource"></a> `_processingEntitiesReactiveSource?` | [`ReactiveSource`](../../../dataobject/reactive/ReactiveSource/README.md)\<`number`\> | `undefined` | [src/concurrency/processor\_v2.ts:114](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L114) |
| <a id="_processor"></a> `_processor` | `Processor`\<`T`, `U`\> | `undefined` | [src/concurrency/processor\_v2.ts:104](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L104) |
| <a id="_queue"></a> `_queue` | `T`[] | `[]` | [src/concurrency/processor\_v2.ts:103](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L103) |
| <a id="_remainingreactivesource"></a> `_remainingReactiveSource?` | [`ReactiveSource`](../../../dataobject/reactive/ReactiveSource/README.md)\<`number`\> | `undefined` | [src/concurrency/processor\_v2.ts:112](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L112) |
| <a id="_root"></a> `_root?` | `QueueProcessor`\<`any`, `any`\> | `undefined` | [src/concurrency/processor\_v2.ts:111](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L111) |
| <a id="_runonupdatebatch"></a> `_runOnUpdateBatch` | () => `void` | `undefined` | [src/concurrency/processor\_v2.ts:118](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L118) |
| <a id="_totalremainingreactivesource"></a> `_totalRemainingReactiveSource?` | [`ReactiveSource`](../../../dataobject/reactive/ReactiveSource/README.md)\<`number`\> | `undefined` | [src/concurrency/processor\_v2.ts:113](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L113) |
| <a id="addprocessingbatch"></a> `addProcessingBatch` | (`value`: `number`) => `this` | `undefined` | [src/concurrency/processor\_v2.ts:511](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L511) |
| <a id="batchsize"></a> `batchSize` | `number` | `1` | [src/concurrency/processor\_v2.ts:126](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L126) |
| <a id="concurrentlimit"></a> `concurrentLimit` | `number` | `1` | [src/concurrency/processor\_v2.ts:123](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L123) |
| <a id="delay"></a> `delay` | `number` | `0` | [src/concurrency/processor\_v2.ts:133](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L133) |
| <a id="deleteprocessingbatch"></a> `deleteProcessingBatch` | (`value`: `number`) => `boolean` | `undefined` | [src/concurrency/processor\_v2.ts:516](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L516) |
| <a id="interval"></a> `interval` | `number` | `0` | [src/concurrency/processor\_v2.ts:135](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L135) |
| <a id="maintaindelay"></a> `maintainDelay` | `boolean` | `undefined` | [src/concurrency/processor\_v2.ts:134](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L134) |
| <a id="processingentities"></a> `processingEntities` | `number` | `0` | [src/concurrency/processor\_v2.ts:138](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L138) |
| <a id="waitingentries"></a> `waitingEntries` | `number` | `0` | [src/concurrency/processor\_v2.ts:141](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L141) |
| <a id="yieldthreshold"></a> `yieldThreshold` | `number` | `1` | [src/concurrency/processor\_v2.ts:129](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L129) |

## Accessors

### isSuspended

#### Get Signature

```ts
get isSuspended(): boolean;
```

Defined in: [src/concurrency/processor\_v2.ts:394](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L394)

##### Returns

`boolean`

***

### nowProcessing

#### Get Signature

```ts
get nowProcessing(): number;
```

Defined in: [src/concurrency/processor\_v2.ts:146](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L146)

##### Returns

`number`

***

### remaining

#### Get Signature

```ts
get remaining(): number;
```

Defined in: [src/concurrency/processor\_v2.ts:153](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L153)

##### Returns

`number`

***

### root

#### Get Signature

```ts
get root(): QueueProcessor<any, any>;
```

Defined in: [src/concurrency/processor\_v2.ts:185](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L185)

##### Returns

`QueueProcessor`\<`any`, `any`\>

***

### totalNowProcessing

#### Get Signature

```ts
get totalNowProcessing(): number;
```

Defined in: [src/concurrency/processor\_v2.ts:149](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L149)

##### Returns

`number`

***

### totalRemaining

#### Get Signature

```ts
get totalRemaining(): number;
```

Defined in: [src/concurrency/processor\_v2.ts:156](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L156)

##### Returns

`number`

## Methods

### \_\_notifyIfIdle()

```ts
__notifyIfIdle(): void;
```

Defined in: [src/concurrency/processor\_v2.ts:234](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L234)

#### Returns

`void`

***

### \_canCollectBatch()

```ts
_canCollectBatch(): boolean;
```

Defined in: [src/concurrency/processor\_v2.ts:417](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L417)

#### Returns

`boolean`

***

### \_clearTickDelay()

```ts
_clearTickDelay(): void;
```

Defined in: [src/concurrency/processor\_v2.ts:225](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L225)

#### Returns

`void`

***

### \_collectBatch()

```ts
_collectBatch(): T[];
```

Defined in: [src/concurrency/processor\_v2.ts:414](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L414)

#### Returns

`T`[]

***

### \_initClerks()

```ts
_initClerks(): void;
```

Defined in: [src/concurrency/processor\_v2.ts:526](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L526)

#### Returns

`void`

***

### \_initEventHub()

```ts
_initEventHub(): void;
```

Defined in: [src/concurrency/processor\_v2.ts:192](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L192)

#### Returns

`void`

***

### \_isIdle()

```ts
_isIdle(): boolean;
```

Defined in: [src/concurrency/processor\_v2.ts:370](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L370)

#### Returns

`boolean`

***

### \_notifyIfIdle()

```ts
_notifyIfIdle(): void;
```

Defined in: [src/concurrency/processor\_v2.ts:231](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L231)

#### Returns

`void`

***

### \_onTick()

```ts
_onTick(): void;
```

Defined in: [src/concurrency/processor\_v2.ts:243](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L243)

#### Returns

`void`

***

### \_process()

```ts
_process(): Promise<void>;
```

Defined in: [src/concurrency/processor\_v2.ts:561](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L561)

#### Returns

`Promise`\<`void`\>

***

### \_run()

```ts
_run(): void;
```

Defined in: [src/concurrency/processor\_v2.ts:588](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L588)

#### Returns

`void`

***

### \_runProcessor()

```ts
_runProcessor(items: T[]): Promise<void>;
```

Defined in: [src/concurrency/processor\_v2.ts:479](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L479)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `items` | `T`[] |

#### Returns

`Promise`\<`void`\>

***

### \_triggerTickDelay()

```ts
_triggerTickDelay(): void;
```

Defined in: [src/concurrency/processor\_v2.ts:217](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L217)

#### Returns

`void`

***

### \_updateBatchProcessStatus()

```ts
_updateBatchProcessStatus(): void;
```

Defined in: [src/concurrency/processor\_v2.ts:409](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L409)

#### Returns

`void`

***

### \_updateReactiveSource()

```ts
_updateReactiveSource(): void;
```

Defined in: [src/concurrency/processor\_v2.ts:398](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L398)

#### Returns

`void`

***

### \_waitFor()

```ts
_waitFor<T>(keys: T, timeout?: number): Promise<
  | typeof TIMED_OUT_SIGNAL
| T[number]>;
```

Defined in: [src/concurrency/processor\_v2.ts:196](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L196)

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* keyof `ProcessorEvents`[] |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `keys` | `T` |
| `timeout?` | `number` |

#### Returns

`Promise`\<
  \| *typeof* [`TIMED_OUT_SIGNAL`](../../../promises/TIMED_OUT_SIGNAL-1/README.md)
  \| `T`\[`number`\]\>

***

### \_waitForIdle()

```ts
_waitForIdle(): Promise<void>;
```

Defined in: [src/concurrency/processor\_v2.ts:373](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L373)

#### Returns

`Promise`\<`void`\>

***

### \_waitForSuspended()

```ts
_waitForSuspended(): Promise<void>;
```

Defined in: [src/concurrency/processor\_v2.ts:445](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L445)

#### Returns

`Promise`\<`void`\>

***

### clearQueue()

```ts
clearQueue(): void;
```

Defined in: [src/concurrency/processor\_v2.ts:335](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L335)

Clear the queue

#### Returns

`void`

#### Remarks

I know that you have known this is very dangerous.

***

### enqueue()

```ts
enqueue(entity: T): this;
```

Defined in: [src/concurrency/processor\_v2.ts:421](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L421)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entity` | `T` |

#### Returns

`this`

***

### enqueueAll()

```ts
enqueueAll(entities: T[]): this;
```

Defined in: [src/concurrency/processor\_v2.ts:427](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L427)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entities` | `T`[] |

#### Returns

`this`

***

### flush()

```ts
flush(): Promise<boolean>;
```

Defined in: [src/concurrency/processor\_v2.ts:447](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L447)

#### Returns

`Promise`\<`boolean`\>

***

### idleDetectors()

```ts
idleDetectors(): Promise<void>[];
```

Defined in: [src/concurrency/processor\_v2.ts:386](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L386)

#### Returns

`Promise`\<`void`\>[]

***

### isIdle()

```ts
isIdle(): boolean;
```

Defined in: [src/concurrency/processor\_v2.ts:367](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L367)

#### Returns

`boolean`

***

### modifyQueue()

```ts
modifyQueue(processor: (queue: T[]) => T[]): void;
```

Defined in: [src/concurrency/processor\_v2.ts:326](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L326)

Modify the queue by force.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `processor` | (`queue`: `T`[]) => `T`[] |  |

#### Returns

`void`

#### Remarks

I know that you have known this is very dangerous.

***

### onUpdateProgress()

```ts
onUpdateProgress(proc: () => void): this;
```

Defined in: [src/concurrency/processor\_v2.ts:345](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L345)

Set the handler for when the queue has been modified

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `proc` | () => `void` |  |

#### Returns

`this`

***

### pipeTo()

```ts
pipeTo<V>(pipeTo: QueueProcessor<U, V>): QueueProcessor<U, V>;
```

Defined in: [src/concurrency/processor\_v2.ts:355](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L355)

Join another processor

#### Type Parameters

| Type Parameter |
| ------ |
| `V` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `pipeTo` | `QueueProcessor`\<`U`, `V`\> |  |

#### Returns

`QueueProcessor`\<`U`, `V`\>

***

### pump()

```ts
pump(): AsyncGenerator<T[], void, unknown>;
```

Defined in: [src/concurrency/processor\_v2.ts:491](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L491)

#### Returns

`AsyncGenerator`\<`T`[], `void`, `unknown`\>

***

### replaceEnqueueProcessor()

```ts
replaceEnqueueProcessor(processor: (queue: T[], newItem: T) => T[]): this;
```

Defined in: [src/concurrency/processor\_v2.ts:316](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L316)

replace enqueue logic.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `processor` | (`queue`: `T`[], `newItem`: `T`) => `T`[] | enqueue logic. this should return new queue. |

#### Returns

`this`

***

### requestNextFlush()

```ts
requestNextFlush(): void;
```

Defined in: [src/concurrency/processor\_v2.ts:438](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L438)

#### Returns

`void`

***

### resume()

```ts
resume(): this;
```

Defined in: [src/concurrency/processor\_v2.ts:170](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L170)

#### Returns

`this`

***

### resumePipeLine()

```ts
resumePipeLine(): this;
```

Defined in: [src/concurrency/processor\_v2.ts:175](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L175)

#### Returns

`this`

***

### startPipeline()

```ts
startPipeline(): this;
```

Defined in: [src/concurrency/processor\_v2.ts:180](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L180)

#### Returns

`this`

***

### suspend()

```ts
suspend(): QueueProcessor<T, U>;
```

Defined in: [src/concurrency/processor\_v2.ts:164](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L164)

#### Returns

`QueueProcessor`\<`T`, `U`\>

***

### terminate()

```ts
terminate(): void;
```

Defined in: [src/concurrency/processor\_v2.ts:596](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L596)

#### Returns

`void`

***

### terminateAll()

```ts
terminateAll(): void;
```

Defined in: [src/concurrency/processor\_v2.ts:593](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L593)

#### Returns

`void`

***

### updateReactiveSource()

```ts
updateReactiveSource(): void;
```

Defined in: [src/concurrency/processor\_v2.ts:401](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L401)

#### Returns

`void`

***

### updateStatus()

```ts
updateStatus(setFunc: () => void): void;
```

Defined in: [src/concurrency/processor\_v2.ts:159](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L159)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `setFunc` | () => `void` |

#### Returns

`void`

***

### waitForAllDoneAndTerminate()

```ts
waitForAllDoneAndTerminate(timeout?: number): Promise<boolean>;
```

Defined in: [src/concurrency/processor\_v2.ts:472](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L472)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `timeout?` | `number` |

#### Returns

`Promise`\<`boolean`\>

***

### waitForAllDownstream()

```ts
waitForAllDownstream(timeout?: number): Promise<boolean>;
```

Defined in: [src/concurrency/processor\_v2.ts:453](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L453)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `timeout?` | `number` |

#### Returns

`Promise`\<`boolean`\>

***

### waitForAllProcessed()

```ts
waitForAllProcessed(timeout?: number): Promise<boolean>;
```

Defined in: [src/concurrency/processor\_v2.ts:468](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L468)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `timeout?` | `number` |

#### Returns

`Promise`\<`boolean`\>
