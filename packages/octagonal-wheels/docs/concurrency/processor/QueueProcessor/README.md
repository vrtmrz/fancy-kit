[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [processor](../README.md) / QueueProcessor

# Class: QueueProcessor\<T, U\>

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:95

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |
| `U`            |

## Constructors

### Constructor

```ts
new QueueProcessor<T, U>(
   processor: Processor<T, U>,
   params?: ProcessorParams<U>,
   items?: T[],
enqueueProcessor?: (queue: T[], newEntity: T) => T[]): QueueProcessor<T, U>;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:271

#### Parameters

| Parameter           | Type                                        |
| ------------------- | ------------------------------------------- |
| `processor`         | `Processor`\<`T`, `U`\>                     |
| `params?`           | `ProcessorParams`\<`U`\>                    |
| `items?`            | `T`[]                                       |
| `enqueueProcessor?` | (`queue`: `T`[], `newEntity`: `T`) => `T`[] |

#### Returns

`QueueProcessor`\<`T`, `U`\>

## Properties

| Property                                                                               | Type                                                                                                                           | Default value | Defined in                                                     |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------- | -------------------------------------------------------------- |
| <a id="_clerks"></a> `_clerks`                                                         | [`ClerkGroup`](../../../bureau/clerk/ClerkGroup/README.md)\<`T`[], [`Clerk`](../../../bureau/clerk/Clerk/README.md)\<`T`[]\>\> | `undefined`   | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:518 |
| <a id="_collected"></a> `_collected`                                                   | [`Inbox`](../../../bureau/inbox/Inbox/README.md)\<`T`[]\>                                                                      | `undefined`   | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:517 |
| <a id="_delaytimer"></a> `_delayTimer?`                                                | `Timeout`                                                                                                                      | `undefined`   | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:267 |
| <a id="_enqueueprocessor"></a> `_enqueueProcessor`                                     | (`queue`: `T`[], `newEntity`: `T`) => `T`[]                                                                                    | `undefined`   | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:98  |
| <a id="_hub"></a> `_hub`                                                               | [`EventHub`](../../../events/EventHub/README.md)\<`ProcessorEvents`\>                                                          | `undefined`   | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:137 |
| <a id="_intervalpacemaker"></a> `_intervalPaceMaker`                                   | [`PaceMaker`](../../../bureau/pacemaker/PaceMaker/README.md)                                                                   | `undefined`   | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:269 |
| <a id="_issuspended"></a> `_isSuspended`                                               | `boolean`                                                                                                                      | `true`        | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:99  |
| <a id="_keepresultuntildownstreamconnected"></a> `_keepResultUntilDownstreamConnected` | `boolean`                                                                                                                      | `false`       | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:108 |
| <a id="_keptresult"></a> `_keptResult`                                                 | `U`[]                                                                                                                          | `undefined`   | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:109 |
| <a id="_nextprocessneedsimmediate"></a> `_nextProcessNeedsImmediate`                   | `boolean`                                                                                                                      | `false`       | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:100 |
| <a id="_pipeto"></a> `_pipeTo?`                                                        | `QueueProcessor`\<`U`, `any`\>                                                                                                 | `undefined`   | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:102 |
| <a id="_processcount"></a> `_processCount`                                             | `number`                                                                                                                       | `0`           | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:519 |
| <a id="_processing"></a> `_processing`                                                 | `boolean`                                                                                                                      | `false`       | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:515 |
| <a id="_processingbatches"></a> `_processingBatches`                                   | `Set`\<`number`\>                                                                                                              | `undefined`   | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:504 |
| <a id="_processingentitiesreactivesource"></a> `_processingEntitiesReactiveSource?`    | [`ReactiveSource`](../../../dataobject/reactive/ReactiveSource/README.md)\<`number`\>                                          | `undefined`   | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:107 |
| <a id="_processor"></a> `_processor`                                                   | `Processor`\<`T`, `U`\>                                                                                                        | `undefined`   | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:97  |
| <a id="_queue"></a> `_queue`                                                           | `T`[]                                                                                                                          | `[]`          | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:96  |
| <a id="_remainingreactivesource"></a> `_remainingReactiveSource?`                      | [`ReactiveSource`](../../../dataobject/reactive/ReactiveSource/README.md)\<`number`\>                                          | `undefined`   | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:105 |
| <a id="_root"></a> `_root?`                                                            | `QueueProcessor`\<`any`, `any`\>                                                                                               | `undefined`   | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:104 |
| <a id="_runonupdatebatch"></a> `_runOnUpdateBatch`                                     | () => `void`                                                                                                                   | `undefined`   | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:111 |
| <a id="_totalremainingreactivesource"></a> `_totalRemainingReactiveSource?`            | [`ReactiveSource`](../../../dataobject/reactive/ReactiveSource/README.md)\<`number`\>                                          | `undefined`   | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:106 |
| <a id="addprocessingbatch"></a> `addProcessingBatch`                                   | (`value`: `number`) => `this`                                                                                                  | `undefined`   | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:505 |
| <a id="batchsize"></a> `batchSize`                                                     | `number`                                                                                                                       | `1`           | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:119 |
| <a id="concurrentlimit"></a> `concurrentLimit`                                         | `number`                                                                                                                       | `1`           | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:116 |
| <a id="delay"></a> `delay`                                                             | `number`                                                                                                                       | `0`           | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:126 |
| <a id="deleteprocessingbatch"></a> `deleteProcessingBatch`                             | (`value`: `number`) => `boolean`                                                                                               | `undefined`   | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:510 |
| <a id="interval"></a> `interval`                                                       | `number`                                                                                                                       | `0`           | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:128 |
| <a id="maintaindelay"></a> `maintainDelay`                                             | `boolean`                                                                                                                      | `undefined`   | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:127 |
| <a id="processingentities"></a> `processingEntities`                                   | `number`                                                                                                                       | `0`           | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:131 |
| <a id="waitingentries"></a> `waitingEntries`                                           | `number`                                                                                                                       | `0`           | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:134 |
| <a id="yieldthreshold"></a> `yieldThreshold`                                           | `number`                                                                                                                       | `1`           | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:122 |

## Accessors

### isSuspended

#### Get Signature

```ts
get isSuspended(): boolean;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:388

##### Returns

`boolean`

---

### nowProcessing

#### Get Signature

```ts
get nowProcessing(): number;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:139

##### Returns

`number`

---

### remaining

#### Get Signature

```ts
get remaining(): number;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:146

##### Returns

`number`

---

### root

#### Get Signature

```ts
get root(): QueueProcessor<any, any>;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:179

##### Returns

`QueueProcessor`\<`any`, `any`\>

---

### totalNowProcessing

#### Get Signature

```ts
get totalNowProcessing(): number;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:142

##### Returns

`number`

---

### totalRemaining

#### Get Signature

```ts
get totalRemaining(): number;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:149

##### Returns

`number`

## Methods

### \_\_notifyIfIdle()

```ts
__notifyIfIdle(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:228

#### Returns

`void`

---

### \_canCollectBatch()

```ts
_canCollectBatch(): boolean;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:411

#### Returns

`boolean`

---

### \_clearTickDelay()

```ts
_clearTickDelay(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:219

#### Returns

`void`

---

### \_collectBatch()

```ts
_collectBatch(): T[];
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:408

#### Returns

`T`[]

---

### \_initClerks()

```ts
_initClerks(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:520

#### Returns

`void`

---

### \_initEventHub()

```ts
_initEventHub(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:186

#### Returns

`void`

---

### \_isIdle()

```ts
_isIdle(): boolean;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:364

#### Returns

`boolean`

---

### \_notifyIfIdle()

```ts
_notifyIfIdle(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:225

#### Returns

`void`

---

### \_onTick()

```ts
_onTick(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:237

#### Returns

`void`

---

### \_process()

```ts
_process(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:555

#### Returns

`Promise`\<`void`\>

---

### \_run()

```ts
_run(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:582

#### Returns

`void`

---

### \_runProcessor()

```ts
_runProcessor(items: T[]): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:473

#### Parameters

| Parameter | Type  |
| --------- | ----- |
| `items`   | `T`[] |

#### Returns

`Promise`\<`void`\>

---

### \_triggerTickDelay()

```ts
_triggerTickDelay(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:211

#### Returns

`void`

---

### \_updateBatchProcessStatus()

```ts
_updateBatchProcessStatus(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:403

#### Returns

`void`

---

### \_updateReactiveSource()

```ts
_updateReactiveSource(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:392

#### Returns

`void`

---

### \_waitFor()

```ts
_waitFor<T>(keys: T, timeout?: number): Promise<
  | typeof TIMED_OUT_SIGNAL
| T[number]>;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:190

#### Type Parameters

| Type Parameter                          |
| --------------------------------------- |
| `T` _extends_ keyof `ProcessorEvents`[] |

#### Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `keys`     | `T`      |
| `timeout?` | `number` |

#### Returns

`Promise`\<
\| _typeof_ [`TIMED_OUT_SIGNAL`](../../../promises/TIMED_OUT_SIGNAL-1/README.md)
\| `T`\[`number`\]\>

---

### \_waitForIdle()

```ts
_waitForIdle(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:367

#### Returns

`Promise`\<`void`\>

---

### \_waitForSuspended()

```ts
_waitForSuspended(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:439

#### Returns

`Promise`\<`void`\>

---

### clearQueue()

```ts
clearQueue(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:329

Clear the queue

#### Returns

`void`

#### Remarks

I know that you have known this is very dangerous.

---

### enqueue()

```ts
enqueue(entity: T): this;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:415

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `entity`  | `T`  |

#### Returns

`this`

---

### enqueueAll()

```ts
enqueueAll(entities: T[]): this;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:421

#### Parameters

| Parameter  | Type  |
| ---------- | ----- |
| `entities` | `T`[] |

#### Returns

`this`

---

### flush()

```ts
flush(): Promise<boolean>;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:441

#### Returns

`Promise`\<`boolean`\>

---

### idleDetectors()

```ts
idleDetectors(): Promise<void>[];
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:380

#### Returns

`Promise`\<`void`\>[]

---

### isIdle()

```ts
isIdle(): boolean;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:361

#### Returns

`boolean`

---

### modifyQueue()

```ts
modifyQueue(processor: (queue: T[]) => T[]): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:320

Modify the queue by force.

#### Parameters

| Parameter   | Type                      | Description |
| ----------- | ------------------------- | ----------- |
| `processor` | (`queue`: `T`[]) => `T`[] | -           |

#### Returns

`void`

#### Remarks

I know that you have known this is very dangerous.

---

### onUpdateProgress()

```ts
onUpdateProgress(proc: () => void): this;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:339

Set the handler for when the queue has been modified

#### Parameters

| Parameter | Type         | Description |
| --------- | ------------ | ----------- |
| `proc`    | () => `void` | -           |

#### Returns

`this`

---

### pipeTo()

```ts
pipeTo<V>(pipeTo: QueueProcessor<U, V>): QueueProcessor<U, V>;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:349

Join another processor

#### Type Parameters

| Type Parameter |
| -------------- |
| `V`            |

#### Parameters

| Parameter | Type                         | Description |
| --------- | ---------------------------- | ----------- |
| `pipeTo`  | `QueueProcessor`\<`U`, `V`\> | -           |

#### Returns

`QueueProcessor`\<`U`, `V`\>

---

### pump()

```ts
pump(): AsyncGenerator<T[], void, unknown>;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:485

#### Returns

`AsyncGenerator`\<`T`[], `void`, `unknown`\>

---

### replaceEnqueueProcessor()

```ts
replaceEnqueueProcessor(processor: (queue: T[], newItem: T) => T[]): this;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:310

replace enqueue logic.

#### Parameters

| Parameter   | Type                                      | Description                                  |
| ----------- | ----------------------------------------- | -------------------------------------------- |
| `processor` | (`queue`: `T`[], `newItem`: `T`) => `T`[] | enqueue logic. this should return new queue. |

#### Returns

`this`

---

### requestNextFlush()

```ts
requestNextFlush(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:432

#### Returns

`void`

---

### resume()

```ts
resume(): this;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:163

#### Returns

`this`

---

### resumePipeLine()

```ts
resumePipeLine(): this;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:169

#### Returns

`this`

---

### startPipeline()

```ts
startPipeline(): this;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:174

#### Returns

`this`

---

### suspend()

```ts
suspend(): QueueProcessor<T, U>;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:157

#### Returns

`QueueProcessor`\<`T`, `U`\>

---

### terminate()

```ts
terminate(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:590

#### Returns

`void`

---

### terminateAll()

```ts
terminateAll(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:587

#### Returns

`void`

---

### updateReactiveSource()

```ts
updateReactiveSource(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:395

#### Returns

`void`

---

### updateStatus()

```ts
updateStatus(setFunc: () => void): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:152

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `setFunc` | () => `void` |

#### Returns

`void`

---

### waitForAllDoneAndTerminate()

```ts
waitForAllDoneAndTerminate(timeout?: number): Promise<boolean>;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:466

#### Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `timeout?` | `number` |

#### Returns

`Promise`\<`boolean`\>

---

### waitForAllDownstream()

```ts
waitForAllDownstream(timeout?: number): Promise<boolean>;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:447

#### Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `timeout?` | `number` |

#### Returns

`Promise`\<`boolean`\>

---

### waitForAllProcessed()

```ts
waitForAllProcessed(timeout?: number): Promise<boolean>;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:462

#### Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `timeout?` | `number` |

#### Returns

`Promise`\<`boolean`\>
