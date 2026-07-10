[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [lock](../README.md) / ConcurrentTaskController

# Class: ConcurrentTaskController

Defined in: [src/concurrency/lock\_v2.ts:200](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/lock_v2.ts#L200)

Concurrency controller to limit the number of concurrent tasks.
Similar to a semaphore but with a simpler `run` method.
Petit semaphore for limiting concurrency.

## Constructors

### Constructor

```ts
new ConcurrentTaskController(maxConcurrency: number): ConcurrentTaskController;
```

Defined in: [src/concurrency/lock\_v2.ts:203](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/lock_v2.ts#L203)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `maxConcurrency` | `number` |

#### Returns

`ConcurrentTaskController`

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="maxconcurrency"></a> `maxConcurrency` | `public` | `number` | [src/concurrency/lock\_v2.ts:201](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/lock_v2.ts#L201) |

## Accessors

### currentConcurrency

#### Get Signature

```ts
get currentConcurrency(): number;
```

Defined in: [src/concurrency/lock\_v2.ts:216](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/lock_v2.ts#L216)

##### Returns

`number`

***

### currentPressure

#### Get Signature

```ts
get currentPressure(): number;
```

Defined in: [src/concurrency/lock\_v2.ts:213](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/lock_v2.ts#L213)

Current number of waiting and running tasks.

##### Returns

`number`

## Methods

### \_\_acquire()

```ts
__acquire(): Promise<() => void>;
```

Defined in: [src/concurrency/lock\_v2.ts:224](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/lock_v2.ts#L224)

Manually acquire a slot for running a task.

#### Returns

`Promise`\<() => `void`\>

A releaser function to call when the task is done.

***

### run()

```ts
run<T>(task: () => Promise<T>, reportProgress?: () => Promise<any>): Promise<T>;
```

Defined in: [src/concurrency/lock\_v2.ts:253](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/lock_v2.ts#L253)

Run a task with concurrency control.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `task` | () => `Promise`\<`T`\> | task to run |
| `reportProgress?` | () => `Promise`\<`any`\> | optional function to report progress (e.g., update UI) |

#### Returns

`Promise`\<`T`\>

result of the task

***

### waitForAllReleased()

```ts
waitForAllReleased(): Promise<void>;
```

Defined in: [src/concurrency/lock\_v2.ts:275](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/lock_v2.ts#L275)

Wait until all running tasks are released.
Note: This does not prevent new tasks from being started after this method returns.

#### Returns

`Promise`\<`void`\>
