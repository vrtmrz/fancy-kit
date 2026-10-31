[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [lock](../README.md) / ConcurrentTaskController

# Class: ConcurrentTaskController

Defined in: packages/octagonal-wheels/src/concurrency/lock\_v2.ts:156

Concurrency controller to limit the number of concurrent tasks.
Similar to a semaphore but with a simpler `run` method.
Petit semaphore for limiting concurrency.

## Constructors

### Constructor

```ts
new ConcurrentTaskController(maxConcurrency: number): ConcurrentTaskController;
```

Defined in: packages/octagonal-wheels/src/concurrency/lock\_v2.ts:159

#### Parameters

| Parameter        | Type     |
| ---------------- | -------- |
| `maxConcurrency` | `number` |

#### Returns

`ConcurrentTaskController`

## Properties

| Property                                     | Modifier | Type     | Defined in                                                |
| -------------------------------------------- | -------- | -------- | --------------------------------------------------------- |
| <a id="maxconcurrency"></a> `maxConcurrency` | `public` | `number` | packages/octagonal-wheels/src/concurrency/lock\_v2.ts:157 |

## Accessors

### currentConcurrency

#### Get Signature

```ts
get currentConcurrency(): number;
```

Defined in: packages/octagonal-wheels/src/concurrency/lock\_v2.ts:172

##### Returns

`number`

---

### currentPressure

#### Get Signature

```ts
get currentPressure(): number;
```

Defined in: packages/octagonal-wheels/src/concurrency/lock\_v2.ts:169

Current number of waiting and running tasks.

##### Returns

`number`

## Methods

### \_\_acquire()

```ts
__acquire(): Promise<() => void>;
```

Defined in: packages/octagonal-wheels/src/concurrency/lock\_v2.ts:180

Manually acquire a slot for running a task.

#### Returns

`Promise`\<() => `void`\>

A releaser function to call when the task is done.

---

### run()

```ts
run<T>(task: () => Promise<T>, reportProgress?: () => Promise<any>): Promise<T>;
```

Defined in: packages/octagonal-wheels/src/concurrency/lock\_v2.ts:209

Run a task with concurrency control.

#### Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

#### Parameters

| Parameter         | Type                     | Description                                            |
| ----------------- | ------------------------ | ------------------------------------------------------ |
| `task`            | () => `Promise`\<`T`\>   | task to run                                            |
| `reportProgress?` | () => `Promise`\<`any`\> | optional function to report progress (e.g., update UI) |

#### Returns

`Promise`\<`T`\>

result of the task

---

### waitForAllReleased()

```ts
waitForAllReleased(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/concurrency/lock\_v2.ts:231

Wait until all running tasks are released.
Note: This does not prevent new tasks from being started after this method returns.

#### Returns

`Promise`\<`void`\>
